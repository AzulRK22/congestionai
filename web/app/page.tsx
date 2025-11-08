'use client';
import { useState } from 'react';

function Heatmap({ data }:{data:{hourOfWeek:number, risk:number}[]}){
  const cells = data || [];
  return (
    <div className="grid grid-cols-24 gap-0.5 border p-2 rounded">
      {cells.map((c,idx)=>{
        const intensity = Math.round(c.risk*100);
        return <div key={idx} title={`h${c.hourOfWeek} risk ${intensity}%`} className="w-3 h-3" style={{background:`hsl(0, 70%, ${30+intensity*0.5}%)`}}/>;
      })}
    </div>
  );
}

export default function Page(){
  const [origin,setOrigin]=useState('');
  const [dest,setDest]=useState('');
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);

  async function plan(){
    setLoading(true);
    const res = await fetch('/api/analyze',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({origin, destination: dest, window:'next72'})});
    const json = await res.json();
    setData(json); setLoading(false);
  }

  function addICS(){
    if(!data?.best) return;
    const start = new Date(data.best.departAtISO);
    const end = new Date(start.getTime() + data.best.etaMin*60000);
    const stamp = (d:Date)=> d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      'SUMMARY:Salida óptima (CongestionAI)','END:VEVENT','END:VCALENDAR'
    ].join('\n');
    const blob = new Blob([ics],{type:'text/calendar'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='congestionai.ics'; a.click();
  }

  function copyWhatsApp(){
    if(!data?.best) return;
    const t = new Date(data.best.departAtISO).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    const msg = `Salgo ${t} para evitar tráfico. ETA ~${data.best.etaMin} min (ahorro ${(data.best.savingVsNow*100|0)}%) – CongestionAI`;
    navigator.clipboard.writeText(msg);
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">CongestionAI</h1>
      <p className="text-sm text-gray-600">“Te digo cuándo NO manejar” — demo 1 clic</p>
      <input className="w-full border p-2 rounded" placeholder="Origen" value={origin} onChange={e=>setOrigin(e.target.value)}/>
      <input className="w-full border p-2 rounded" placeholder="Destino" value={dest} onChange={e=>setDest(e.target.value)}/>
      <button onClick={plan} className="btn">{loading ? 'Calculando…' : 'Planear'}</button>

      {data && (
        <section className="card space-y-3">
          <div className="text-lg font-semibold">
            Sal {new Date(data.best.departAtISO).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
            {' '}· ETA {data.best.etaMin} min · Ahorro {(data.best.savingVsNow*100|0)}%
          </div>
          <div className="flex gap-2">
            <button onClick={addICS} className="border rounded px-3 py-1">Add to Calendar</button>
            <button onClick={copyWhatsApp} className="border rounded px-3 py-1">Copy WhatsApp</button>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Heatmap próximas 72h</h3>
            <Heatmap data={data.heatmap}/>
          </div>
          <p className="text-xs text-gray-500">{data.notes?.join(' · ')}</p>
        </section>
      )}
    </main>
  );
}
