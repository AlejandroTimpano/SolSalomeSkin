(function () {
  // -------- Config localStorage --------
  const KEY_BOOKING = "SSS_TURNO_UNICO"; // guarda UNA reserva y bloquea posteriores

  // -------- Utilidades de fecha/horarios --------
  function parseYMD(dateStr) {
    const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d); // local time
  }

  function isMonToSat(dateStr) {
    if (!dateStr) return false;
    const day = parseYMD(dateStr).getDay(); // 0=Dom,1=Lun,...,6=Sab
    return day >= 1 && day <= 6;
  }

  function slots() {
    return ["09:00", "11:00", "13:00", "15:00", "17:00"];
  }

  function slotId(dateStr, timeStr) {
    return `${dateStr}_${timeStr.replace(":", "")}`;
  }

  function todayStr() {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // -------- Estado en storage --------
  function getStoredBooking() {
    try {
      const raw = localStorage.getItem(KEY_BOOKING);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function setStoredBooking(obj) {
    localStorage.setItem(KEY_BOOKING, JSON.stringify(obj));
  }
  function clearStoredBooking() {
    localStorage.removeItem(KEY_BOOKING);
  }

  // -------- Render de horarios (sin backend) --------
  function renderSlotsFree(horaSelect, listEl, takenSet) {
    if (!horaSelect || !listEl) return;
    horaSelect.innerHTML = '<option value="">Elegí horario…</option>';
    listEl.innerHTML = "";
    slots().forEach((x) => {
      const libre = !takenSet || !takenSet.has(x);
      const opt = document.createElement("option");
      opt.value = x;
      opt.textContent = libre ? x : `${x} — Ocupado`;
      if (!libre) opt.disabled = true;
      horaSelect.appendChild(opt);

      const li = document.createElement("li");
      li.textContent = libre ? `${x} — Libre` : `${x} — Reservado`;
      listEl.appendChild(li);
    });
  }

  function showBookedInfo(container, booking) {
    if (!container) return;
    if (!booking) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }
    container.style.display = "block";
    container.innerHTML = `
      <h3 style="margin-top:.2rem">Tu turno reservado en este navegador</h3>
      <p><strong>Fecha:</strong> ${booking.fecha}</p>
      <p><strong>Hora:</strong> ${booking.hora}</p>
      <p><strong>Nombre:</strong> ${booking.nombre}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      ${booking.servicio ? `<p><strong>Servicio:</strong> ${booking.servicio}</p>` : ""}
      ${booking.notas ? `<p><strong>Notas:</strong> ${booking.notas}</p>` : ""}
      <div style="margin-top:.8rem">
        <button id="clear_booking" class="btn" type="button">Liberar reserva</button>
      </div>
      <p class="muted" style="margin-top:.6rem">
        Si liberás la reserva, vas a poder tomar otro turno.
      </p>
    `;
  }

  function disableForm(form, reasonText) {
    form.querySelectorAll("input, select, textarea, button[type=submit]").forEach((el) => {
      el.disabled = true;
    });
    if (reasonText) {
      const feedback = document.getElementById("t_feedback");
      if (feedback) feedback.textContent = reasonText;
    }
  }
  function enableForm(form) {
    form.querySelectorAll("input, select, textarea, button[type=submit]").forEach((el) => {
      el.disabled = false;
    });
  }

  // -------- App --------
  async function init() {
    const form = document.getElementById("turnos-form");
    const fecha = document.getElementById("t_fecha");
    const hora = document.getElementById("t_hora");
    const list = document.getElementById("t_list");
    const feedback = document.getElementById("t_feedback");
    const bookedInfo = document.getElementById("booked_info");

    function setMinToday() {
      const ts = todayStr();
      fecha.min = ts;
      if (!fecha.value) fecha.value = ts;
    }

    // Reserva existente en este navegador
    let existing = getStoredBooking();

    // “Ocupado” si coincide la fecha con la reserva guardada
    function takenForDate(dateStr) {
      const set = new Set();
      if (existing && existing.fecha === dateStr) {
        set.add(existing.hora);
      }
      return set;
    }

    async function paint(dateStr) {
      if (!dateStr) return;
      if (!isMonToSat(dateStr)) {
        feedback.textContent = "Solo lunes a sábado.";
        renderSlotsFree(hora, list, new Set());
        return;
      }
      feedback.textContent = "";
      renderSlotsFree(hora, list, takenForDate(dateStr));
    }

    // --- Inicialización UI ---
    setMinToday();
    await paint(fecha.value);
    fecha.addEventListener("change", () => paint(fecha.value));
    fecha.addEventListener("input", () => paint(fecha.value));

    // Mostrar y manejar “Liberar reserva” si existe
    showBookedInfo(bookedInfo, existing);
    if (existing) {
      disableForm(form, "Ya tenés un turno reservado en este navegador.");
      bookedInfo.addEventListener("click", (e) => {
        const btn = e.target.closest("#clear_booking");
        if (!btn) return;
        // Limpiar reserva y re-habilitar
        clearStoredBooking();
        existing = null;
        showBookedInfo(bookedInfo, null);
        enableForm(form);
        feedback.textContent = "Reserva liberada. Podés tomar otro turno.";
        setMinToday();
        paint(fecha.value);
      });
    }

    // --- Envío del formulario (sin backend) ---
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (existing) {
        feedback.textContent = "Ya hay una reserva en este navegador. Liberala para continuar.";
        return;
      }

      if (!fecha.value || !isMonToSat(fecha.value)) {
        feedback.textContent = "Elegí una fecha de lunes a sábado.";
        return;
      }
      if (!hora.value) {
        feedback.textContent = "Elegí un horario.";
        return;
      }

      const nombre = document.getElementById("t_nombre");
      const email = document.getElementById("t_email");
      const servicio = document.getElementById("t_servicio");
      const notas = document.getElementById("t_notas");

      if (!nombre.value.trim()) {
        feedback.textContent = "Ingresá tu nombre.";
        nombre.focus();
        return;
      }

      const emailVal = email.value.trim().toLowerCase();
      const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      if (!mailOk) {
        feedback.textContent = "Ingresá un email válido.";
        email.focus();
        return;
      }

      // Chequeo local de choque (misma fecha/hora) por seguridad
      const taken = takenForDate(fecha.value);
      if (taken.has(hora.value)) {
        feedback.textContent = "Ese horario ya está reservado en este navegador.";
        return;
      }

      const booking = {
        id: slotId(fecha.value, hora.value),
        fecha: fecha.value,
        hora: hora.value,
        nombre: nombre.value.trim(),
        email: emailVal,
        servicio: servicio?.value || "",
        notas: notas?.value || "",
        createdAt: new Date().toISOString(),
      };

      // Guardar y bloquear
      setStoredBooking(booking);
      existing = booking;

      feedback.textContent = "¡Turno reservado con éxito!";
      showBookedInfo(bookedInfo, booking);
      disableForm(form, "Este navegador ya posee una reserva.");
      await paint(fecha.value);
    });
  }

  // Ejecutar init cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

