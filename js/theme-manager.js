export default class ThemeManager{
  constructor(){
    this.key = 'rcdc-theme';
  }

  init(){
    const saved = localStorage.getItem(this.key);
    if(saved){ this.applyTheme(saved); return; }
    // default to system preference if available
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark ? 'dark' : 'light');
  }

  toggleTheme(){
    const curr = document.documentElement.getAttribute('data-theme')==='dark' ? 'dark' : 'light';
    const next = curr==='dark' ? 'light' : 'dark';
    this.applyTheme(next);
    this.saveTheme(next);
    return next;
  }

  saveTheme(t){
    localStorage.setItem(this.key,t);
  }

  applyTheme(t){
    if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.setAttribute('data-theme','light');
    const btn = document.getElementById('theme-toggle');
    if(btn) btn.textContent = (t==='dark'?'☀️':'🌙');
    console.log('Theme applied:', t);
  }
}
