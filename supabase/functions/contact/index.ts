import { withSupabase } from "npm:@supabase/server";

const SERVICE_LABELS: Record<string, string> = {
  "vida": "Seguro de Vida",
  "gastos-medicos": "Gastos Médicos Mayores",
  "auto": "Seguro de Auto",
  "hogar": "Seguro de Hogar",
  "financiera": "Planificación Financiera y Retiro",
  "empresarial": "Seguro Empresarial",
  "todos": "Todos los productos",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

export default {
  fetch: withSupabase({ auth: "publishable" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
    }

    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
    }

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const service = (body.service ?? "").trim();
    const message = (body.message ?? "").trim();

    if (!name || !email || !phone || !service) {
      return Response.json(
        { error: "name, email, phone y service son obligatorios" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Guardar en la base de datos (el cliente admin evita depender de políticas RLS)
    const { error: dbError } = await ctx.supabaseAdmin
      .from("inquiries")
      .insert({ name, email, phone, service, message: message || null });

    if (dbError) {
      console.error("Error guardando consulta:", dbError);
      return Response.json({ error: "Error al guardar" }, { status: 500, headers: CORS_HEADERS });
    }

    // Notificar por correo vía Resend (si falla, la consulta ya quedó guardada)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const serviceLabel = SERVICE_LABELS[service] ?? service;
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FENIX Web <onboarding@resend.dev>",
          // Resend sin dominio verificado solo entrega al correo de la cuenta
          to: ["alvaro.toledo.e01@gmail.com"],
          reply_to: email,
          subject: `Nueva consulta de ${name} — FENIX Patrimoniales`,
          html: `<h2>Nueva solicitud de asesoría</h2>
<p><strong>Nombre:</strong> ${esc(name)}</p>
<p><strong>Teléfono:</strong> ${esc(phone)}</p>
<p><strong>Email:</strong> ${esc(email)}</p>
<p><strong>Producto de interés:</strong> ${esc(serviceLabel)}</p>
${message ? `<p><strong>Mensaje:</strong> ${esc(message)}</p>` : ""}
<br/>
<p>Responde cuanto antes para no perder esta oportunidad.</p>`,
        }),
      });
      if (!emailRes.ok) {
        console.error("Error enviando correo:", await emailRes.text());
      }
    } else {
      console.warn("RESEND_API_KEY no configurada; se omite la notificación por correo");
    }

    return Response.json({ ok: true }, { headers: CORS_HEADERS });
  }),
};
