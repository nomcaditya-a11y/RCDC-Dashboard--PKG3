export default class ChartManager{
  constructor(){
    this.charts = {};
  }

  createRegionChart(ctx, data){
    const labels = Object.keys(data);
    const reconnected = labels.map(l=>data[l].filter(r=>r.status==='reconnected').length);
    const disconnected = labels.map(l=>data[l].filter(r=>r.status==='disconnected').length);

    this.destroy('region');
    this.charts.region = new Chart(ctx,{type:'bar',data:{labels, datasets:[{label:'Reconnected',data:reconnected,backgroundColor:'#10b981'},{label:'Disconnected',data:disconnected,backgroundColor:'#ef4444'}]},options:{plugins:{legend:{display:true},tooltip:{mode:'index'},datalabels:{display:false}},responsive:true,scales:{x:{stacked:true},y:{stacked:true}}});
    return this.charts.region;
  }

  createStatusChart(ctx, summary){
    this.destroy('status');
    const data = [summary.reconnected, summary.disconnected, summary.pending];
    this.charts.status = new Chart(ctx,{type:'doughnut',data:{labels:['Reconnected','Disconnected','Pending'],datasets:[{data,backgroundColor:['#10b981','#ef4444','#f59e0b']}]},options:{cutout:'60%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.label}}}});
    return this.charts.status;
  }

  createTrendChart(ctx, dates){
    this.destroy('trend');
    const labels = dates.map(d=>d.date);
    const data = dates.map(d=>d.reconnected);
    const gradient = ctx.createLinearGradient(0,0,0,300);
    gradient.addColorStop(0,'rgba(37,99,235,0.45)');
    gradient.addColorStop(1,'rgba(37,99,235,0.05)');

    this.charts.trend = new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Reconnections',data,fill:true,backgroundColor:gradient,borderColor:'#2563eb',tension:0.4}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(0,0,0,0.04)'}}}}});
    return this.charts.trend;
  }

  destroy(key){
    if(key){
      if(this.charts[key]){this.charts[key].destroy();delete this.charts[key];}
      return;
    }
    Object.keys(this.charts).forEach(k=>{try{this.charts[k].destroy()}catch(e){};delete this.charts[k];});
  }
}
