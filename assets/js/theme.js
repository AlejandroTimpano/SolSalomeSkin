
(function(){
  const KEY='sss_theme_pref'; // 'light' | 'dark' | null (auto)
  function apply(pref){
    if(pref==='dark'){ document.documentElement.setAttribute('data-theme','dark'); }
    else{ document.documentElement.removeAttribute('data-theme'); }
  }
  function load(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function save(pref){ try{ localStorage.setItem(KEY, pref||''); }catch(e){} }
  function init(){
    apply(load());
    const btn = document.getElementById('theme-toggle');
    if(!btn) return;
    const updateLabel = () => {
      const dark = document.documentElement.getAttribute('data-theme')==='dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.querySelector('.label').textContent = dark ? 'Modo claro' : 'Modo oscuro';
      btn.querySelector('.icon').innerHTML = dark
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.76 4.84l-1.8-1.79 1.41-1.41 1.79 1.8L6.76 4.84zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zm7.04-2.96l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 13h3v-2h-3v2zM11 1h2v3h-2V1zM4.22 18.36l-1.8 1.79 1.41 1.41 1.79-1.8-1.4-1.4zM12 6a6 6 0 100 12 6 6 0 000-12z"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.354 15.354A9 9 0 118.646 3.646 7 7 0 0020.354 15.354z"/></svg>';
    };
    btn.addEventListener('click', ()=>{
      const isDark = document.documentElement.getAttribute('data-theme')==='dark';
      const next = isDark ? null : 'dark'; // alterna entre auto (null) y dark
      if(next) save(next); else save('');
      apply(next);
      updateLabel();
    });
    updateLabel();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
