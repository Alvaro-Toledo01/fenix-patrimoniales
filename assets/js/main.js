document.addEventListener("DOMContentLoaded", function () {
  var menuBtn = document.querySelector(".mobile-menu-btn");
  var nav = document.querySelector(".main-nav");
  var ctaHeader = document.querySelector(".cta-header");

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      nav.classList.toggle("open");
      if (ctaHeader) ctaHeader.classList.toggle("open");
    });
  }

  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector("button[type='submit']");
      var originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Enviando...";

      var data = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        service: form.service.value,
        message: form.message.value.trim()
      };

      var cfg = window.FENIX_CONFIG || {};
      var configured =
        cfg.SUPABASE_URL &&
        cfg.SUPABASE_URL.indexOf("REEMPLAZAR") === -1 &&
        cfg.SUPABASE_PUBLISHABLE_KEY &&
        cfg.SUPABASE_PUBLISHABLE_KEY.indexOf("REEMPLAZAR") === -1;

      var success = false;

      if (configured) {
        try {
          var res = await fetch(cfg.SUPABASE_URL + "/functions/v1/contact", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + cfg.SUPABASE_PUBLISHABLE_KEY,
              "apikey": cfg.SUPABASE_PUBLISHABLE_KEY
            },
            body: JSON.stringify(data)
          });
          success = res.ok;
          if (!res.ok) {
            console.error("Error del servidor:", await res.text());
          }
        } catch (err) {
          console.error("Error enviando la solicitud:", err);
        }
      }

      if (!configured || !success) {
        // Respaldo: abrir el cliente de correo con los datos prellenados
        var serviceLabels = {
          vida: "Seguro de Vida",
          "gastos-medicos": "Gastos Médicos Mayores",
          auto: "Seguro de Auto",
          hogar: "Seguro de Hogar",
          financiera: "Planificación Financiera y Retiro",
          todos: "Todos los productos"
        };
        var subject = "Nueva consulta de " + data.name + " - FENIX Patrimoniales";
        var body =
          "Nombre: " + data.name + "\n" +
          "Teléfono: " + data.phone + "\n" +
          "Email: " + data.email + "\n" +
          "Producto de interés: " + (serviceLabels[data.service] || data.service) + "\n" +
          (data.message ? "Mensaje: " + data.message + "\n" : "");
        window.location.href =
          "mailto:fenixpatrimoniales@gmail.com?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
      }

      form.style.display = "none";
      var successBox = document.getElementById("form-success");
      if (successBox) successBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    });
  }
});
