
(function(){
  const load = (src) => new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });

  function isMonToSat(dateStr){
    const g = new Date(dateStr + 'T12:00:00');
    const day = g.getDay();
    return day >= 1 && day <= 6;
  }
  function slots(){
    const result = [];
    for(let h=9; h<=17; h+=2){
      const hh = String(h).padStart(2,'0');
      result.push(hh + ':00');
    }
    return result;
  }
  const slotId = (dateStr, timeStr) => dateStr + "_" + timeStr.replace(":","");
  function todayStr(){
    const t = new Date(); t.setHours(0,0,0,0);
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth()+1).padStart(2,'0');
    const dd = String(t.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async function init(){
    const form = document.getElementById('turnos-form');
    const fecha = document.getElementById('t_fecha');
    const hora  = document.getElementById('t_hora');
    const list  = document.getElementById('t_list');
    const feedback = document.getElementById('t_feedback');

    function setMinToday(){
      const ts = todayStr();
      if (fecha) fecha.min = ts;
      if (!fecha.value) fecha.value = ts;
    }
    function renderSlotsFree(takenSet){
      if (!hora || !list) return;
      hora.innerHTML = '<option value=\"\">Elegí horario…</option>';
      list.innerHTML = '';
      const s = slots();
      s.forEach(x => {
        const free = !takenSet || !takenSet.has(x);
        const opt = document.createElement('option');
        opt.value = x;
        opt.textContent = x + (free ? '' : ' — Ocupado');
        if(!free) opt.disabled = true;
        hora.appendChild(opt);
        const li = document.createElement('li');
        li.textContent = x + (free ? ' — Libre' : ' — Reservado');
        list.appendChild(li);
      });
    }

    // Firebase opcional
    const hasCfg = !!(window && window.firebaseConfig && window.firebaseConfig.projectId);
    let db = null;
    if (hasCfg){
      try{
        await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
        await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
        firebase.initializeApp(window.firebaseConfig);
        db = firebase.firestore();
      }catch(e){
        console.warn('No se pudo cargar Firebase, modo UI-only:', e);
      }
    }

    async function readDay(dateStr){
      if (!db) return new Set();
      const prefix = dateStr + '_';
      const snap = await db.collection('turnos')
        .where(firebase.firestore.FieldPath.documentId(), '>=', prefix)
        .where(firebase.firestore.FieldPath.documentId(), '<', dateStr + '_9999')
        .get();
      const taken = new Set();
      snap.forEach(doc=> taken.add(doc.data().hora));
      return taken;
    }

    async function paint(dateStr){
      if (!dateStr) return;
      if (!isMonToSat(dateStr)){
        feedback.textContent = 'Solo lunes a sábado.';
        hora.innerHTML = '<option value=\"\">Elegí horario…</option>';
        list.innerHTML = '';
        return;
      }
      feedback.textContent = '';
      const taken = await readDay(dateStr);
      renderSlotsFree(taken);
    }

    setMinToday();
    await paint(fecha.value);

    fecha?.addEventListener('change', ()=> paint(fecha.value));

    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(!fecha.value || !isMonToSat(fecha.value)){ feedback.textContent='Elegí una fecha de lunes a sábado.'; return; }
      if(!hora.value){ feedback.textContent='Elegí un horario.'; return; }
      const nombre = document.getElementById('t_nombre');
      const email  = document.getElementById('t_email');
      const servicio = document.getElementById('t_servicio');
      const notas = document.getElementById('t_notas');

      if(!nombre.value.trim()){ feedback.textContent='Ingresá tu nombre.'; nombre.focus(); return; }
      const mailOk = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.value);
      if(!mailOk){ feedback.textContent='Ingresá un email válido.'; email.focus(); return; }

      if (!db){
        feedback.textContent = 'Reserva simulada (falta config Firebase). Completá assets/js/firebase-config.js';
        return;
      }

      const id = slotId(fecha.value, hora.value);
      const ref = db.collection('turnos').doc(id);
      try{
        await db.runTransaction(async (tx)=>{
          const snap = await tx.get(ref);
          if (snap.exists) throw new Error('superpuesto');
          tx.set(ref, {
            fecha: fecha.value,
            hora: hora.value,
            nombre: nombre.value.trim(),
            email: email.value.trim(),
            servicio: servicio?.value || '',
            notas: notas?.value || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        feedback.textContent = '¡Turno reservado con éxito!';
        form.reset();
        await paint(fecha.value);
      }catch(err){
        if (String(err).includes('superpuesto')){
          feedback.textContent = 'Ese turno ya fue reservado. Elegí otro horario.';
          await paint(fecha.value);
        }else{
          console.error(err);
          feedback.textContent = 'Ocurrió un error al reservar. Revisá configuración y reglas.';
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
