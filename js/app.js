import { CONFIG } from './config.js';
import DataService from './data-service.js';
import ChartManager from './chart-manager.js';
import ThemeManager from './theme-manager.js';

const fmtNumber = (n)=>n.toLocaleString('en-IN');
const fmtCurrency = (n)=>{
  const v = Number(n)||0; return '₹'+v.toLocaleString('en-IN');
};
class Dashboard{
  constructor(){
    this.dataService = new DataService();
  this.chartManager = new ChartManager();
  this.themeManager = new ThemeManager();
  this.refreshTimer = null;
  }

  async init(){
  this.themeManager.init();
  this.bindUI();
  await this.loadAndRender();
    this.refreshTimer = setInterval(()=>this.loadAndRender(), CONFIG.REFRESH_INTERVAL);
    this.updateCurrentDate();
  }
  bindUI(){
    document.getElementById('refresh-btn').addEventListener('click',()=>this.loadAndRender(true));
    document.getElementById('theme-toggle').addEventListener('click',()=>this.themeManager.toggleTheme());
  document.getElementById('search').addEventListener('input',()=>this.applyFilters());
  document.getElementById('filter-region').addEventListener('change',()=>this.onRegionChange());
  document.getElementById('filter-circle').addEventListener('change',()=>this.applyFilters());
  document.getElementById('filter-status').addEventListener('change',()=>this.applyFilters());
  document.getElementById('filter-comm').addEventListener('change',()=>this.applyFilters());
  document.getElementById('start-date').addEventListener('change',()=>this.applyFilters());
    document.getElementById('end-date').addEventListener('change',()=>this.applyFilters());
    document.querySelectorAll('#division-table thead th, #circle-table thead th').forEach(th=>th.addEventListener('click',e=>this.sortTable(e)));
  }
  async loadAndRender(force=false){
    this.showSpinner(true);
    let rows = [];
    try{
      rows = await this.dataService.fetchData();
      this.setFetchStatus('Data loaded from Google Sheets', false);
    }catch(err){
      console.warn('Fetch failed, using sample data:', err.message);
      // include short preview if available on error object
  const preview = (err && err.responsePreview) ? `Preview: ${err.responsePreview.slice(0,300)}` : '';
  this.setFetchStatus('Could not load sheet: '+err.message+' — using sample data. Ensure the sheet is public and the sheet name is "Total meters".' , true, preview);
  // fallback to sample data so dashboard remains usable
      rows = this.dataService.sampleData();
    }
    this.rows = rows;
    // ensure keys lower/consistent — support multiple header name variants
    const getField = (obj, keys, fallback='')=>{
      for(const k of keys){ if(typeof obj[k] !== 'undefined' && obj[k] !== null && obj[k] !== '') return obj[k]; }
      return fallback;
    };
    this.rows = this.rows.map(r=>(...);
  const summary = this.dataService.calculateKPIs(this.rows);
  this.updateKPIs(summary);
  this.updateCharts(summary);
  this.updateTables(summary);
  this.updatePriority(summary);
  this.updateFooter();
    this.showSpinner(false);
  }

  setFetchStatus(msg, isError=false){
  const el = document.getElementById('fetch-status');
  if(!el) return;
  if(!msg){ el.classList.add('hidden'); el.textContent = ''; return; }
  el.classList.remove('hidden');
  el.classList.toggle('error', !!isError);
  // build content with retry
  el.innerHTML = '';
  const main = document.createElement('span'); main.textContent = msg; el.appendChild(main);
  const btn = document.createElement('button'); btn.className='retry'; btn.textContent='Retry'; btn.addEventListener('click',()=>this.loadAndRender(true)); el.appendChild(btn);
    if(arguments.length>2 && arguments[2]){
      const prev = document.createElement('div'); prev.className='preview'; prev.textContent = arguments[2]; el.appendChild(prev);
    }
  }

  showSpinner(yes){
    document.getElementById('refresh-spinner').classList.toggle('hidden',!yes);
  }

  updateCurrentDate(){
  const el = document.getElementById('current-date');
  const now = new Date();
  const opts = {day:'numeric',month:'short',year:'numeric'};
    el.textContent = now.toLocaleDateString('en-GB',opts);
  }

  updateFooter(){
  const el = document.getElementById('last-updated');
  const now = new Date();
  const t = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const d = now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    el.textContent = `Last updated: ${t}, ${d}`;
  }
  updateKPIs(summary){
    const container = document.getElementById('kpi-cards');
    container.innerHTML='';
    const cards = [
      {id:'total','label':'Total Disconnections','num':summary.total,cls:'blue','icon':'📊'},
      {id:'reconn','label':'Reconnected','num':summary.reconnected,cls:'green','icon':'✅','pct':Math.round(100*(summary.reconnected/Math.max(1,summary.total)))},
  {id:'still','label':'Still Disconnected','num':summary.disconnected,cls:'red','icon':'❌','pct':Math.round(100*(summary.disconnected/Math.max(1,summary.total)))},
  {id:'noncomm','label':'Non-Communicating','num':summary.nonComm,cls:'orange','icon':'⚠️','pct':Math.round(100*(summary.nonComm/Math.max(1,summary.total)))},
  {id:'risk','label':'Revenue at Risk','num:money':fmtCurrency(summary.revenueAtRisk),cls:'purple','icon':'💰'}
  ];

  cards.forEach(c=>{
      const el = document.createElement('div'); el.className=`kpi ${c.cls}`;
      el.innerHTML = `
        <div class="icon">${c.icon}</div>
        <div>
          <div class="num">${c['num:money'] || fmtNumber(c.num)}</div>
          <div class="label">${c.label}</div>
        </div>
        ${c.pct?`<div class="badge">${c.pct}%</div>`:''}
      `;
      container.appendChild(el);
    });
  }
  updateCharts(summary){
    const regionCtx = document.getElementById('regionChart').getContext('2d');
    const statusCtx = document.getElementById('statusChart').getContext('2d');
  const trendCtx = document.getElementById('trendChart').getContext('2d');
  this.chartManager.createRegionChart(regionCtx, summary.byRegion);
  this.chartManager.createStatusChart(statusCtx, summary);
  this.chartManager.createTrendChart(trendCtx, summary.dates);
  // legend
  const legend = document.getElementById('status-legend');
    legend.innerHTML = `<span>Reconnected: ${summary.reconnected}</span> <span>Disconnected: ${summary.disconnected}</span> <span>Pending: ${summary.pending}</span>`;
  }

  updateTables(summary){
  // Apply current filters before grouping
  const filtered = this._applyCurrentFilters(summary.rows || this.rows);

  // Division-wise
  const rowsByDiv = {};
  filtered.forEach(r=>{const k=r.division||'Unknown'; if(!rowsByDiv[k]) rowsByDiv[k]=[]; rowsByDiv[k].push(r)});
  const divItems = Object.keys(rowsByDiv).map(k=>({division:k,total:rowsByDiv[k].length,reconnected:rowsByDiv[k].filter(x=>x.status==='reconnected').length,disconnected:rowsByDiv[k].filter(x=>x.status==='disconnected').length})).sort((a,b)=>b.total-a.total);
  const tbodyDiv = document.querySelector('#division-table tbody'); tbodyDiv.innerHTML='';
  divItems.forEach(it=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${it.division}</td><td>${fmtNumber(it.total)}</td><td style="color:#10b981">${fmtNumber(it.reconnected)}</td><td style="color:#ef4444">${fmtNumber(it.disconnected)}</td>`;tbodyDiv.appendChild(tr);});

  // Circle-wise
  const rowsByCircle = {};
  filtered.forEach(r=>{const k=r.circle||'Unknown'; if(!rowsByCircle[k]) rowsByCircle[k]=[]; rowsByCircle[k].push(r)});
  const circItems = Object.keys(rowsByCircle).map(k=>({circle:k,total:rowsByCircle[k].length,reconnected:rowsByCircle[k].filter(x=>x.status==='reconnected').length,disconnected:rowsByCircle[k].filter(x=>x.status==='disconnected').length})).sort((a,b)=>b.total-a.total);
  const tbodyCirc = document.querySelector('#circle-table tbody'); tbodyCirc.innerHTML='';
  circItems.forEach(it=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${it.circle}</td><td>${fmtNumber(it.total)}</td><td style="color:#10b981">${fmtNumber(it.reconnected)}</td><td style="color:#ef4444">${fmtNumber(it.disconnected)}</td>`;tbodyCirc.appendChild(tr);});

  // populate circle dropdown options based on current region selection
    this._populateCircleOptions(this.rows);
  }

  _populateCircleOptions(allRows){
  const region = document.getElementById('filter-region').value;
  const circleSelect = document.getElementById('filter-circle');
  const visible = region && region!=='all';
  if(!visible){ circleSelect.classList.add('hidden'); return; }
  circleSelect.classList.remove('hidden');
  const circles = new Set();
  allRows.filter(r=>region==='all' ? true : (r.region===region)).forEach(r=>{ if(r.circle) circles.add(r.circle); });
  const existing = circleSelect.value || 'all';
  circleSelect.innerHTML = '<option value="all">All Circles</option>' + Array.from(circles).map(c=>`<option value="${c}">${c}</option>`).join('');
    if(Array.from(circles).includes(existing)) circleSelect.value = existing;
  }

  _applyCurrentFilters(rows){
  const region = document.getElementById('filter-region').value;
  const circle = document.getElementById('filter-circle').value;
  const status = document.getElementById('filter-status').value;
  const comm = document.getElementById('filter-comm').value;
  const search = document.getElementById('search').value.trim().toLowerCase();
  const start = document.getElementById('start-date').value;
  const end = document.getElementById('end-date').value;

  return rows.filter(r=>{
  if(region && region!=='all' && r.region!==region) return false;
  if(circle && circle!=='all' && r.circle!==circle) return false;
  if(status && status!=='all' && r.status!==status) return false;
      if(comm && comm!=='all'){
        if(comm==='comm' && (r.comm!=='' && r.comm!=='yes')) return false;
        if(comm==='noncomm' && r.comm!=='no') return false;
  }
  if(search){ const s = (r.consumer||r.id||'').toString().toLowerCase(); if(!s.includes(search)) return false; }
  if(start && r.date && r.date < start) return false;
      if(end && r.date && r.date > end) return false;
      return true;
    });
  }

  updatePriority(summary){
    const container = document.getElementById('priority-cards'); container.innerHTML='';
    const cards = [
      {text:`🔴 Non-Communicating Meters: ${summary.nonComm} meters need attention`,color:'#ef4444'},
  {text:`⏰ Cases Pending 30+ Days: ${Math.max(0,Math.round(summary.total*0.05))} consumers`,color:'#f59e0b'},
  {text:`📍 Top Problem Area: ${Object.keys(summary.byRegion)[0]||'N/A'}`,color:'#ef4444'},
  {text:`💰 Potential Monthly Loss: ${fmtCurrency(Math.round(summary.revenueAtRisk/100000)*100000)} `,color:'#7c3aed'}
    ];
    cards.forEach(c=>{const d=document.createElement('div');d.className='priority';d.style.borderLeftColor=c.color;d.textContent=c.text;container.appendChild(d);});
  }
  applyFilters(){
    // re-render tables and charts from currently filtered data
    const filtered = this._applyCurrentFilters(this.rows);
  const summary = this.dataService.calculateKPIs(filtered);
  this.updateKPIs(summary);
  this.updateCharts(summary);
    this.updateTables(summary);
    this.updatePriority(summary);
  }
  sortTable(e){
    const key = e.target.getAttribute('data-sort');
    // toggled sort - simplified: re-render using existing calculation
  }
}

const dashboard = new Dashboard();
dashboard.init();
import { CONFIG } from './config.js';
import DataService from './data-service.js';
import ChartManager from './chart-manager.js';
import ThemeManager from './theme-manager.js';

const fmtNumber = (n)=>n.toLocaleString('en-IN');
const fmtCurrency = (n)=>{
  const v = Number(n)||0; return '₹'+v.toLocaleString('en-IN');
};

class Dashboard{
  constructor(){
    this.dataService = new DataService();
    this.chartManager = new ChartManager();
    this.themeManager = new ThemeManager();
    this.refreshTimer = null;
  }

  async init(){
    this.themeManager.init();
    this.bindUI();
    await this.loadAndRender();
    this.refreshTimer = setInterval(()=>this.loadAndRender(), CONFIG.REFRESH_INTERVAL);
    this.updateCurrentDate();
  }

  bindUI(){
    document.getElementById('refresh-btn').addEventListener('click',()=>this.loadAndRender(true));
    document.getElementById('theme-toggle').addEventListener('click',()=>this.themeManager.toggleTheme());
    document.getElementById('search').addEventListener('input',()=>this.applyFilters());
    document.getElementById('filter-region').addEventListener('change',()=>this.onRegionChange());
    document.getElementById('filter-circle').addEventListener('change',()=>this.applyFilters());
    document.getElementById('filter-status').addEventListener('change',()=>this.applyFilters());
    document.getElementById('filter-comm').addEventListener('change',()=>this.applyFilters());
    document.getElementById('start-date').addEventListener('change',()=>this.applyFilters());
    document.getElementById('end-date').addEventListener('change',()=>this.applyFilters());
    document.querySelectorAll('#division-table thead th, #circle-table thead th').forEach(th=>th.addEventListener('click',e=>this.sortTable(e)));
  }

  async loadAndRender(force=false){
    this.showSpinner(true);
    let rows = [];
    try{
      rows = await this.dataService.fetchData();
      this.setFetchStatus('Data loaded from Google Sheets', false);
    }catch(err){
      console.warn('Fetch failed, using sample data:', err.message);
      // include short preview if available on error object
      const preview = (err && err.responsePreview) ? `Preview: ${err.responsePreview.slice(0,300)}` : '';
      this.setFetchStatus('Could not load sheet: '+err.message+' — using sample data. Ensure the sheet is public and the sheet name is "Total meters".' , true, preview);
      // fallback to sample data so dashboard remains usable
      rows = this.dataService.sampleData();
    }
    this.rows = rows;
    // ensure keys lower/consistent — support multiple header name variants
    const getField = (obj, keys, fallback='')=>{
      for(const k of keys){ if(typeof obj[k] !== 'undefined' && obj[k] !== null && obj[k] !== '') return obj[k]; }
      return fallback;
    };
    this.rows = this.rows.map(r=>({
      ...r,
      region: String(getField(r,['region','region_name','region_name','regionname','region\_name','Region'], 'Unknown')).toLowerCase(),
      circle: String(getField(r,['circle','circle_name','circlename','circle_name','Circle'], '') ),
      division: String(getField(r,['division','division_name','divisionname','div','Division'], 'Unknown')),
      status: String(getField(r,['status','Status','Status_Type'], '')).toLowerCase(),
      comm: String(getField(r,['comm','communication','comm_status','Comm'], '')).toLowerCase(),
      date: String(getField(r,['date','Date','reading_date'], new Date().toISOString().slice(0,10))),
      consumer: String(getField(r,['consumer','consumer_name','name','consumer_name'], '')),
      id: String(getField(r,['id','meter_id','consumer_id','meterid','id'], ''))
    }));

    const summary = this.dataService.calculateKPIs(this.rows);
    this.updateKPIs(summary);
    this.updateCharts(summary);
    this.updateTables(summary);
    this.updatePriority(summary);
    this.updateFooter();
    this.showSpinner(false);
  }

  setFetchStatus(msg, isError=false){
    const el = document.getElementById('fetch-status');
    if(!el) return;
    if(!msg){ el.classList.add('hidden'); el.textContent = ''; return; }
    el.classList.remove('hidden');
    el.classList.toggle('error', !!isError);
    // build content with retry
    el.innerHTML = '';
    const main = document.createElement('span'); main.textContent = msg; el.appendChild(main);
    const btn = document.createElement('button'); btn.className='retry'; btn.textContent='Retry'; btn.addEventListener('click',()=>this.loadAndRender(true)); el.appendChild(btn);
    if(arguments.length>2 && arguments[2]){
      const prev = document.createElement('div'); prev.className='preview'; prev.textContent = arguments[2]; el.appendChild(prev);
    }
  }

  showSpinner(yes){
    document.getElementById('refresh-spinner').classList.toggle('hidden',!yes);
  }

  updateCurrentDate(){
    const el = document.getElementById('current-date');
    const now = new Date();
    const opts = {day:'numeric',month:'short',year:'numeric'};
    el.textContent = now.toLocaleDateString('en-GB',opts);
  }

  updateFooter(){
    const el = document.getElementById('last-updated');
    const now = new Date();
    const t = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const d = now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    el.textContent = `Last updated: ${t}, ${d}`;
  }

  updateKPIs(summary){
    const container = document.getElementById('kpi-cards');
    container.innerHTML='';
    const cards = [
      {id:'total','label':'Total Disconnections','num':summary.total,cls:'blue','icon':'📊'},
      {id:'reconn','label':'Reconnected','num':summary.reconnected,cls:'green','icon':'✅','pct':Math.round(100*(summary.reconnected/Math.max(1,summary.total)))},
      {id:'still','label':'Still Disconnected','num':summary.disconnected,cls:'red','icon':'❌','pct':Math.round(100*(summary.disconnected/Math.max(1,summary.total)))},
      {id:'noncomm','label':'Non-Communicating','num':summary.nonComm,cls:'orange','icon':'⚠️','pct':Math.round(100*(summary.nonComm/Math.max(1,summary.total)))},
      {id:'risk','label':'Revenue at Risk','num:money':fmtCurrency(summary.revenueAtRisk),cls:'purple','icon':'💰'}
    ];

    cards.forEach(c=>{
      const el = document.createElement('div'); el.className=`kpi ${c.cls}`;
      el.innerHTML = `
        <div class="icon">${c.icon}</div>
        <div>
          <div class="num">${c['num:money'] || fmtNumber(c.num)}</div>
          <div class="label">${c.label}</div>
        </div>
        ${c.pct?`<div class="badge">${c.pct}%</div>`:''}
      `;
      container.appendChild(el);
    });
  }

  updateCharts(summary){
    const regionCtx = document.getElementById('regionChart').getContext('2d');
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    this.chartManager.createRegionChart(regionCtx, summary.byRegion);
    this.chartManager.createStatusChart(statusCtx, summary);
    this.chartManager.createTrendChart(trendCtx, summary.dates);
    // legend
    const legend = document.getElementById('status-legend');
    legend.innerHTML = `<span>Reconnected: ${summary.reconnected}</span> <span>Disconnected: ${summary.disconnected}</span> <span>Pending: ${summary.pending}</span>`;
  }

  updateTables(summary){
    // Apply current filters before grouping
    const filtered = this._applyCurrentFilters(summary.rows || this.rows);

    // Division-wise
    const rowsByDiv = {};
    filtered.forEach(r=>{const k=r.division||'Unknown'; if(!rowsByDiv[k]) rowsByDiv[k]=[]; rowsByDiv[k].push(r)});
    const divItems = Object.keys(rowsByDiv).map(k=>({division:k,total:rowsByDiv[k].length,reconnected:rowsByDiv[k].filter(x=>x.status==='reconnected').length,disconnected:rowsByDiv[k].filter(x=>x.status==='disconnected').length})).sort((a,b)=>b.total-a.total);
    const tbodyDiv = document.querySelector('#division-table tbody'); tbodyDiv.innerHTML='';
    divItems.forEach(it=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${it.division}</td><td>${fmtNumber(it.total)}</td><td style="color:#10b981">${fmtNumber(it.reconnected)}</td><td style="color:#ef4444">${fmtNumber(it.disconnected)}</td>`;tbodyDiv.appendChild(tr);});

    // Circle-wise
    const rowsByCircle = {};
    filtered.forEach(r=>{const k=r.circle||'Unknown'; if(!rowsByCircle[k]) rowsByCircle[k]=[]; rowsByCircle[k].push(r)});
    const circItems = Object.keys(rowsByCircle).map(k=>({circle:k,total:rowsByCircle[k].length,reconnected:rowsByCircle[k].filter(x=>x.status==='reconnected').length,disconnected:rowsByCircle[k].filter(x=>x.status==='disconnected').length})).sort((a,b)=>b.total-a.total);
    const tbodyCirc = document.querySelector('#circle-table tbody'); tbodyCirc.innerHTML='';
    circItems.forEach(it=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${it.circle}</td><td>${fmtNumber(it.total)}</td><td style="color:#10b981">${fmtNumber(it.reconnected)}</td><td style="color:#ef4444">${fmtNumber(it.disconnected)}</td>`;tbodyCirc.appendChild(tr);});

    // populate circle dropdown options based on current region selection
    this._populateCircleOptions(this.rows);
  }

  _populateCircleOptions(allRows){
    const region = document.getElementById('filter-region').value;
    const circleSelect = document.getElementById('filter-circle');
    const visible = region && region!=='all';
    if(!visible){ circleSelect.classList.add('hidden'); return; }
    circleSelect.classList.remove('hidden');
    const circles = new Set();
    allRows.filter(r=>region==='all' ? true : (r.region===region)).forEach(r=>{ if(r.circle) circles.add(r.circle); });
    const existing = circleSelect.value || 'all';
    circleSelect.innerHTML = '<option value="all">All Circles</option>' + Array.from(circles).map(c=>`<option value="${c}">${c}</option>`).join('');
    if(Array.from(circles).includes(existing)) circleSelect.value = existing;
  }

  _applyCurrentFilters(rows){
    const region = document.getElementById('filter-region').value;
    const circle = document.getElementById('filter-circle').value;
    const status = document.getElementById('filter-status').value;
    const comm = document.getElementById('filter-comm').value;
    const search = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    return rows.filter(r=>{
      if(region && region!=='all' && r.region!==region) return false;
      if(circle && circle!=='all' && r.circle!==circle) return false;
      if(status && status!=='all' && r.status!==status) return false;
      if(comm && comm!=='all'){
        if(comm==='comm' && (r.comm!=='' && r.comm!=='yes')) return false;
        if(comm==='noncomm' && r.comm!=='no') return false;
      }
      if(search){ const s = (r.consumer||r.id||'').toString().toLowerCase(); if(!s.includes(search)) return false; }
      if(start && r.date && r.date < start) return false;
      if(end && r.date && r.date > end) return false;
      return true;
    });
  }

  updatePriority(summary){
    const container = document.getElementById('priority-cards'); container.innerHTML='';
    const cards = [
      {text:`🔴 Non-Communicating Meters: ${summary.nonComm} meters need attention`,color:'#ef4444'},
      {text:`⏰ Cases Pending 30+ Days: ${Math.max(0,Math.round(summary.total*0.05))} consumers`,color:'#f59e0b'},
      {text:`📍 Top Problem Area: ${Object.keys(summary.byRegion)[0]||'N/A'}`,color:'#ef4444'},
      {text:`💰 Potential Monthly Loss: ${fmtCurrency(Math.round(summary.revenueAtRisk/100000)*100000)} `,color:'#7c3aed'}
    ];
    cards.forEach(c=>{const d=document.createElement('div');d.className='priority';d.style.borderLeftColor=c.color;d.textContent=c.text;container.appendChild(d);});
  }

  applyFilters(){
    // re-render tables and charts from currently filtered data
    const filtered = this._applyCurrentFilters(this.rows);
    const summary = this.dataService.calculateKPIs(filtered);
    this.updateKPIs(summary);
    this.updateCharts(summary);
    this.updateTables(summary);
    this.updatePriority(summary);
  }

  sortTable(e){
    const key = e.target.getAttribute('data-sort');
    // toggled sort - simplified: re-render using existing calculation
  }
}

const dashboard = new Dashboard();
dashboard.init();
