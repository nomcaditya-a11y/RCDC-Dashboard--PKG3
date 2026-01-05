import { CONFIG } from './config.js';

export default class DataService{
}

// Removed markdown fences
import { CONFIG } from './config.js';

export default class DataService{
  async fetchData(){
    try{
      const res = await fetch(CONFIG.SHEET_URL);
      if(!res.ok) throw new Error('Network');
      const csv = await res.text();
      // Basic validation: if response looks like HTML or an error page, treat as failure
      const low = csv.slice(0,200).toLowerCase();
      if(low.includes('<!doctype') || low.includes('<html') || (low.includes('error') && !low.includes(','))){
        const err = new Error('Invalid CSV response — sheet may be private or URL incorrect');
        err.responsePreview = csv.slice(0,600);
        throw err;
      }
      const rows = this.parseCSV(csv);
      if(rows.length===0){ const err = new Error('CSV parsed but no rows found — check sheet name or permissions'); err.responsePreview = csv.slice(0,600); throw err; }
      return rows;
    }catch(e){
      console.error('DataService.fetchData error:', e.message);
      // bubble up error to caller so UI can show diagnostics
      throw e;
    }
  }

  parseCSV(csv){
    if(!csv) return [];
    const lines = csv.split(/\r?\n/).filter(l=>l.trim().length>0);
    if(lines.length===0) return [];
    // normalize headers to stable keys: trim, lowercase, replace spaces with underscores
    const rawHeaders = this._parseLine(lines.shift());
    const headers = rawHeaders.map(h=>h.toString().trim().toLowerCase().replace(/\s+/g,'_'));
    return lines.map(line=>{
      const values = this._parseLine(line);
      const obj = {};
      headers.forEach((h,i)=>obj[h]=values[i]||'');
      return obj;
    });
  }

  _parseLine(line){
    const res = [];
    let cur = '';
    let inQuotes = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch==='"'){
        if(inQuotes && line[i+1]==='"'){ cur += '"'; i++; continue; }
        inQuotes = !inQuotes;
        continue;
      }
      if(ch===',' && !inQuotes){ res.push(cur); cur=''; continue; }
      cur += ch;
    }
    res.push(cur);
    return res.map(s=>s.trim());
  }

  calculateKPIs(rows){
    const total = rows.length;
    const reconnected = rows.filter(r=>r.status==='reconnected').length;
    const disconnected = rows.filter(r=>r.status==='disconnected').length;
    const pending = rows.filter(r=>r.status==='pending').length;
    const nonComm = rows.filter(r=>r.comm==='no').length;

    const byRegion = this.groupByField(rows,'region');

    // daily trend (last 14 days) mock grouping by date
    const dates = Array.from({length:14}).map((_,i)=>{
      const d = new Date(); d.setDate(d.getDate()- (13-i));
      const key = d.toISOString().slice(0,10);
      return {date:key,reconnected: Math.round(Math.random()*20+5)};
    });

    const revenueAtRisk = CONFIG.AVG_REVENUE_PER_CONSUMER * disconnected;

    return{
      total,reconnected,disconnected,pending,nonComm,byRegion,dates,revenueAtRisk,rows
    };
  }

  groupByField(rows,field){
    const map = {};
    rows.forEach(r=>{
      const key = r[field] || 'Unknown';
      if(!map[key]) map[key]=[];
      map[key].push(r);
    });
    return map;
  }

  sampleData(){
    // generate small sample rows
    const regions=['north','south','east'];
    const rows=[];
    for(let i=1;i<=120;i++){
      const status = Math.random()>0.6? 'reconnected' : (Math.random()>0.85? 'pending':'disconnected');
      const comm = Math.random()>0.85? 'no' : 'yes';
      const circle = ['Circle A','Circle B','Circle C'][i%3];
      rows.push({id:`C${1000+i}`,consumer:`Consumer ${i}`,region:regions[i%3],circle,division:`Div ${(i%10)+1}`,status,comm,date:new Date().toISOString().slice(0,10)});
    }
    return rows;
  }
}
