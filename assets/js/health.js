
// Diagnóstico de Firebase/Firestore para Sol Salome Skin
(function(){
  const $ = (sel) => document.querySelector(sel);
  const log = (msg, ok=true) => {
    const item = document.createElement('li');
    item.textContent = (ok ? '✅ ' : '❌ ') + msg;
    item.style.color = ok ? 'inherit' : '#b00020';
    document.getElementById('health-log').appendChild(item);
  };
  const load = (src) => new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });

  async function run(){
    const btn = $('#run-health');
    btn.disabled = true;
    $('#health-log').innerHTML = '';

    try{
      if (!window.firebaseConfig || !window.firebaseConfig.projectId){
        log('Falta ventana window.firebaseConfig en assets/js/firebase-config.js', false);
        btn.disabled = false;
        return;
      }
      log('Config Firebase encontrada: ' + window.firebaseConfig.projectId);

      await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await load('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      log('SDKs cargados');

      firebase.initializeApp(window.firebaseConfig);
      const db = firebase.firestore();
      log('Firebase inicializado y Firestore accesible');

      const testDate = '2099-01-01';
      const prefix = testDate + '_';
      const q = await db.collection('turnos')
        .where(firebase.firestore.FieldPath.documentId(), '>=', prefix)
        .where(firebase.firestore.FieldPath.documentId(), '<', testDate + '_9999')
        .get();
      log('Lectura OK en /turnos: ' + q.size + ' docs');

      const testId = testDate + '_0900';
      const ref = db.collection('turnos').doc(testId);
      try {
        await db.runTransaction(async (tx)=>{
          const snap = await tx.get(ref);
          if (!snap.exists){
            tx.set(ref, {
              fecha: testDate,
              hora: '09:00',
              nombre: 'TEST HEALTH',
              email: 'noreply@example.com',
              servicio: 'test',
              notas: 'prueba de conectividad',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
        });
        log('Transacción de escritura OK (creación/control de ' + testId + ')');
      } catch (e){
        log('Transacción fallida (revisá Reglas/permiso create): ' + e, false);
      }

      document.getElementById('health-summary').textContent = 'Diagnóstico completado.';
    }catch(err){
      console.error(err);
      log('Fallo general: ' + err, false);
      document.getElementById('health-summary').textContent = 'Se encontraron errores.';
    }finally{
      btn.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('run-health');
    btn?.addEventListener('click', run);
  });
})();
