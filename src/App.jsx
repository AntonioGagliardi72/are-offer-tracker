import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import * as api from "./api.js";

Chart.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

const CATS = {
  consultancy:{label:"Consultancy",code:"CON",color:"#185FA5",bg:"#E6F1FB"},
  service:    {label:"Service",    code:"SVC",color:"#1D9E75",bg:"#E1F5EE"},
  solutions:  {label:"Solutions",  code:"SOL",color:"#7F4AB7",bg:"#EEEDFE"},
  parts:      {label:"Parts",      code:"PRT",color:"#BA7517",bg:"#FAEEDA"},
};
const STATUSES = ["Draft","Submitted","Won","Lost"];
const STATUS_STYLE = {
  Draft:{c:"#67707F",b:"#EEF0F3"}, Submitted:{c:"#185FA5",b:"#E6F1FB"},
  Won:{c:"#1D9E75",b:"#E1F5EE"}, Lost:{c:"#A32D2D",b:"#FCEBEB"},
};
const CCYS = ["USD","AED","EUR"];
const SYM = { USD:"$", AED:"AED ", EUR:"€" };

const num = (n) => (Number(n)||0).toLocaleString("it-IT",{maximumFractionDigits:0});
const money = (n,ccy) => SYM[ccy] + num(n);

function dueClass(d){
  if(!d) return "";
  const diff = (new Date(d) - new Date())/86400000;
  return diff<0 ? "due-over" : diff<=7 ? "due-soon" : "";
}

// ===========================================================================
export default function App(){
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [offers, setOffers] = useState([]);
  const [settings, setSettings] = useState({ base:"USD", rates:{USD:1,AED:3.6725,EUR:0.92}, ratesSource:"manual", ratesDate:null });
  const [view, setView] = useState("dashboard");
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState("");

  const base = settings.base || "USD";
  const rates = settings.rates || {USD:1};
  const toBase = (n,ccy) => ((Number(n)||0)/(rates[ccy]||1))*(rates[base]||1);
  const baseMoney = (n) => SYM[base] + num(n);

  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(""), 2400); };

  async function loadAll(){
    const [o, s] = await Promise.all([api.fetchOffers(), api.fetchSettings()]);
    setOffers(o); setSettings(s);
  }

  useEffect(() => {
    (async () => {
      if (api.getPw()) {
        try { await loadAll(); setAuthed(true); }
        catch { api.clearPw(); }
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <div className="spinner">Caricamento…</div>;
  if (!authed) return <Login onOk={async ()=>{ await loadAll(); setAuthed(true); }} />;

  const go = (v) => { if(v!=="new") setEditId(null); setView(v); };

  const ctx = { offers, settings, base, rates, toBase, baseMoney, showToast,
    reload: loadAll, setView, setEditId, editId };

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="logo">ARE</div>
          <div><h1>Offer Tracker</h1><span>Advanced Rotating Equipment FZE</span></div>
        </div>
        <div className="tabs">
          {[["dashboard","Dashboard"],["new","+ Nuova offerta"],["list","Tutte le offerte"],["settings","Impostazioni"]]
            .map(([k,l]) => (
              <button key={k} className={"tab"+(view===k?" active":"")} onClick={()=>go(k)}>{l}</button>
            ))}
          <button className="signout" onClick={()=>{ api.clearPw(); setAuthed(false); }}>Esci</button>
        </div>
      </div>
      <div className="wrap">
        {view==="dashboard" && <Dashboard {...ctx} />}
        {view==="new" && <OfferForm {...ctx} />}
        {view==="list" && <OfferList {...ctx} />}
        {view==="settings" && <Settings {...ctx} setSettings={setSettings} />}
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

// ===========================================================================
function Login({ onOk }){
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const ok = await api.login(pw);
    if (ok) { api.setPw(pw); try { await onOk(); } catch { setErr("Errore di caricamento"); } }
    else setErr("Password errata");
    setBusy(false);
  };
  return (
    <div id="login">
      <div className="loginbox">
        <div className="logo">ARE</div>
        <h1>Offer Tracker</h1>
        <p>Advanced Rotating Equipment FZE</p>
        <input type="password" placeholder="Password" value={pw}
          onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") submit(); }} autoFocus />
        <button className="btn btn-primary" style={{width:"100%"}} onClick={submit} disabled={busy}>
          {busy ? "Verifica…" : "Entra"}
        </button>
        <div className="err">{err}</div>
      </div>
    </div>
  );
}

// ===========================================================================
function Dashboard({ offers, base, toBase, baseMoney, settings, setView }){
  const total = offers.length;
  if (!total) return (
    <div className="panel"><div className="empty">
      <div className="big">📋</div><p>Ancora nessuna offerta.</p><br/>
      <button className="btn btn-primary" onClick={()=>setView("new")}>Crea la prima offerta</button>
    </div></div>
  );

  const pipeline = offers.filter(o=>o.status==="Submitted").reduce((s,o)=>s+toBase(o.amount,o.currency),0);
  const won = offers.filter(o=>o.status==="Won");
  const wonVal = won.reduce((s,o)=>s+toBase(o.poFinal||o.amount,o.currency),0);
  const decided = offers.filter(o=>o.status==="Won"||o.status==="Lost").length;
  const winRate = decided ? Math.round(won.length/decided*100) : 0;
  const totalVal = offers.reduce((s,o)=>s+toBase(o.amount,o.currency),0);

  const ck = Object.keys(CATS);
  const barData = {
    labels: ck.map(k=>CATS[k].label),
    datasets: [{ data: ck.map(k=>offers.filter(o=>o.category===k).reduce((s,o)=>s+toBase(o.amount,o.currency),0)),
      backgroundColor: ck.map(k=>CATS[k].color), borderRadius:6 }],
  };
  const barOpts = { responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}}, scales:{y:{ticks:{callback:v=>SYM[base]+(v/1000)+"k"}}} };
  const dData = { labels:STATUSES,
    datasets:[{ data:STATUSES.map(s=>offers.filter(o=>o.status===s).length),
      backgroundColor:STATUSES.map(s=>STATUS_STYLE[s].c) }] };
  const dOpts = { responsive:true, maintainAspectRatio:false,
    plugins:{legend:{position:"bottom",labels:{padding:14,font:{size:12}}}} };

  const now = new Date(), soon = [];
  offers.forEach(o => [["Invio",o.subDue],["PO",o.poDue]].forEach(([t,d])=>{
    if(d){ const diff=(new Date(d)-now)/86400000; if(diff>=-3&&diff<=30) soon.push({o,t,d,diff}); }
  }));
  soon.sort((a,b)=>new Date(a.d)-new Date(b.d));

  return (
    <>
      <div className="banner"><span>ℹ️</span><span>
        Valori del cruscotto in valuta base <b>{base}</b>{" "}
        {settings.ratesSource==="OANDA"
          ? <>con cambi OANDA{settings.ratesDate?` del ${settings.ratesDate}`:""}.</>
          : "con cambi manuali."} Modificabili in Impostazioni.
      </span></div>
      <div className="cards">
        <Metric lbl="Offerte totali" val={total} sub={`${decided} decise`} />
        <Metric lbl="Valore totale" val={baseMoney(totalVal)} sub="tutte le offerte" />
        <Metric lbl="Pipeline aperta" val={baseMoney(pipeline)} sub="inviate" />
        <Metric lbl="Valore vinto" val={baseMoney(wonVal)} sub={`${won.length} ordini`} />
        <Metric lbl="Tasso di vittoria" val={winRate+"%"} sub="sulle decise" />
      </div>
      <div className="chartgrid">
        <div className="panel"><h2>Valore per categoria ({base})</h2>
          <div style={{position:"relative",height:280}}><Bar data={barData} options={barOpts} /></div></div>
        <div className="panel"><h2>Offerte per stato</h2>
          <div style={{position:"relative",height:280}}><Doughnut data={dData} options={dOpts} /></div></div>
      </div>
      <div className="panel"><h2>Scadenze prossime (30 giorni)</h2>
        {soon.length ? (
          <table><thead><tr><th>Offer ID</th><th>Cliente</th><th>Tipo</th><th>Scadenza</th><th>Giorni</th></tr></thead>
            <tbody>{soon.map((s,i)=>(
              <tr key={i}><td className="oid">{s.o.id}</td><td>{s.o.directCustomer||"—"}</td>
                <td>{s.t}</td><td className={dueClass(s.d)}>{s.d}</td>
                <td className={dueClass(s.d)}>{Math.round(s.diff)}g</td></tr>
            ))}</tbody></table>
        ) : <p style={{color:"var(--muted)",fontSize:13}}>Nessuna scadenza nei prossimi 30 giorni.</p>}
      </div>
    </>
  );
}
const Metric = ({lbl,val,sub}) => (
  <div className="metric"><div className="lbl">{lbl}</div><div className="val">{val}</div><div className="sub">{sub}</div></div>
);

// ===========================================================================
function OfferForm({ offers, editId, showToast, reload, setView, setEditId }){
  const existing = editId ? offers.find(o=>o.id===editId) : null;
  const [f, setF] = useState(existing || {
    category:"consultancy", endUser:"", directCustomer:"", scope:"",
    amount:"", currency:"USD", status:"Draft", subDue:"", poDue:"", poFinal:"", pdfLink:"",
  });
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(prev=>({ ...prev, [k]:v }));

  const save = async () => {
    setBusy(true);
    try {
      await api.saveOffer(existing ? { ...f, id: existing.id } : f);
      showToast(existing ? "Offerta aggiornata" : "Offerta salvata");
      await reload(); setEditId(null); setView("list");
    } catch(e){ showToast("Errore: "+e.message); setBusy(false); }
  };

  return (
    <>
      <div className="banner"><span>ℹ️</span><span>
        L'Offer ID viene assegnato automaticamente al salvataggio (categoria + anno + progressivo), sempre univoco.
        Il link PDF può puntare a Google Drive, SharePoint o qualsiasi URL condiviso.
      </span></div>
      <div className="panel">
        <h2>{existing ? "Modifica offerta "+existing.id : "Nuova offerta"}</h2>
        <div className="formgrid">
          <Field label="Categoria *">
            <select value={f.category} onChange={e=>set("category",e.target.value)}>
              {Object.keys(CATS).map(k=><option key={k} value={k}>{CATS[k].label}</option>)}
            </select>
          </Field>
          <Field label="Offer ID">
            <input readOnly value={existing ? existing.id : "assegnato al salvataggio"} />
          </Field>
          <Field label="End user">
            <input value={f.endUser} onChange={e=>set("endUser",e.target.value)} placeholder="es. ADNOC Onshore" />
          </Field>
          <Field label="Cliente diretto">
            <input value={f.directCustomer} onChange={e=>set("directCustomer",e.target.value)} placeholder="es. EPC / OEM" />
          </Field>
          <Field label="Descrizione scope" full>
            <textarea value={f.scope} onChange={e=>set("scope",e.target.value)} placeholder="Breve descrizione dei lavori..." />
          </Field>
          <Field label="Importo offerta">
            <div className="amtrow">
              <input type="number" min="0" step="100" value={f.amount} onChange={e=>set("amount",e.target.value)} placeholder="0" />
              <select value={f.currency} onChange={e=>set("currency",e.target.value)}>
                {CCYS.map(x=><option key={x}>{x}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Stato">
            <select value={f.status} onChange={e=>set("status",e.target.value)}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Scadenza invio">
            <input type="date" value={f.subDue||""} onChange={e=>set("subDue",e.target.value)} />
          </Field>
          <Field label="Scadenza PO">
            <input type="date" value={f.poDue||""} onChange={e=>set("poDue",e.target.value)} />
          </Field>
          <Field label="Importo finale PO">
            <input type="number" min="0" step="100" value={f.poFinal} onChange={e=>set("poFinal",e.target.value)} placeholder="all'assegnazione" />
          </Field>
          <Field label="Link PDF (URL documento offerta)" full>
            <input type="url" value={f.pdfLink} onChange={e=>set("pdfLink",e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>
        </div>
        <div className="row-actions">
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Salvataggio…" : (existing ? "Aggiorna offerta" : "Salva offerta")}
          </button>
          <button className="btn btn-ghost" onClick={()=>{ setEditId(null); setView("list"); }}>Annulla</button>
          <span className="hint">* obbligatorio</span>
        </div>
      </div>
    </>
  );
}
const Field = ({label,full,children}) => (
  <div className={"field"+(full?" full":"")}><label>{label}</label>{children}</div>
);

// ===========================================================================
function OfferList({ offers, showToast, reload, setEditId, setView, base, toBase }){
  const [q, setQ] = useState("");
  const [fc, setFc] = useState("");
  const [fs, setFs] = useState("");

  const rows = offers.filter(o => {
    if (fc && o.category!==fc) return false;
    if (fs && o.status!==fs) return false;
    if (q && !((o.id+" "+o.endUser+" "+o.directCustomer+" "+o.scope).toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const del = async (id) => {
    if (!confirm("Eliminare l'offerta "+id+"?")) return;
    try { await api.deleteOffer(id); showToast("Eliminata"); await reload(); }
    catch { showToast("Errore eliminazione"); }
  };

  const exportCSV = () => {
    const h = ["Offer ID","Category","End user","Direct customer","Scope","Amount","Currency",
      "Amount in "+base,"Status","Submission due","PO due","PO final","PDF link"];
    const data = offers.map(o => [o.id, CATS[o.category].label, o.endUser, o.directCustomer, o.scope,
      o.amount, o.currency, Math.round(toBase(o.amount,o.currency)), o.status, o.subDue, o.poDue, o.poFinal, o.pdfLink]);
    const csv = [h,...data].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download = "ARE_offers.csv"; a.click(); showToast("CSV esportato");
  };

  return (
    <>
      <div className="toolbar">
        <input className="search" placeholder="Cerca ID, cliente, scope..." value={q} onChange={e=>setQ(e.target.value)} />
        <select value={fc} onChange={e=>setFc(e.target.value)}>
          <option value="">Tutte le categorie</option>
          {Object.keys(CATS).map(k=><option key={k} value={k}>{CATS[k].label}</option>)}
        </select>
        <select value={fs} onChange={e=>setFs(e.target.value)}>
          <option value="">Tutti gli stati</option>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Esporta CSV</button>
      </div>
      <div className="panel" style={{padding:0,overflowX:"auto"}}>
        {rows.length ? (
          <table><thead><tr>
            <th>Offer ID</th><th>Categoria</th><th>End user</th><th>Cliente diretto</th><th>Importo</th>
            <th>Stato</th><th>Sc. invio</th><th>Sc. PO</th><th>PO finale</th><th>PDF</th><th></th>
          </tr></thead><tbody>{rows.map(o=>{
            const ct=CATS[o.category], st=STATUS_STYLE[o.status];
            return (
              <tr key={o.id}>
                <td className="oid">{o.id}</td>
                <td><span className="pill" style={{background:ct.bg,color:ct.color}}>{ct.label}</span></td>
                <td>{o.endUser||"—"}</td><td>{o.directCustomer||"—"}</td>
                <td>{money(o.amount,o.currency)}</td>
                <td><span className="pill" style={{background:st.b,color:st.c}}>{o.status}</span></td>
                <td className={dueClass(o.subDue)}>{o.subDue||"—"}</td>
                <td className={dueClass(o.poDue)}>{o.poDue||"—"}</td>
                <td>{o.poFinal?money(o.poFinal,o.currency):"—"}</td>
                <td>{o.pdfLink ? <a className="doc" href={o.pdfLink} target="_blank" rel="noreferrer" title="Apri PDF">📄</a> : "—"}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="link" onClick={()=>{ setEditId(o.id); setView("new"); }}>Modifica</button>
                  <button className="link del" onClick={()=>del(o.id)}>Elimina</button>
                </td>
              </tr>
            );
          })}</tbody></table>
        ) : <div className="empty"><p>Nessuna offerta corrisponde.</p></div>}
      </div>
    </>
  );
}

// ===========================================================================
function Settings({ settings, base, showToast, setView, setSettings }){
  const [b, setB] = useState(base);
  const [rates, setRates] = useState(settings.rates || {USD:1,AED:3.6725,EUR:0.92});
  const [busy, setBusy] = useState(false);
  const oanda = settings.ratesSource === "OANDA";

  const save = async () => {
    setBusy(true);
    try {
      const payload = { base:b, rates:{ ...rates, USD:1 } };
      const saved = await api.saveSettings(payload);
      setSettings(saved); showToast("Impostazioni salvate"); setView("dashboard");
    } catch(e){ showToast("Errore: "+e.message); setBusy(false); }
  };

  return (
    <div className="panel">
      <h2>Impostazioni valuta</h2>
      <div className="field" style={{maxWidth:240}}>
        <label>Valuta base (totali cruscotto)</label>
        <select value={b} onChange={e=>setB(e.target.value)}>
          {CCYS.map(x=><option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="banner" style={{marginTop:18}}>
        <span>{oanda?"🔄":"✏️"}</span>
        <span>{oanda
          ? <>I cambi sono aggiornati automaticamente da <b>OANDA</b>{settings.ratesDate?` (ultimo: ${settings.ratesDate})`:""} e qui sono di sola lettura.</>
          : <>Cambi <b>manuali</b>: indica quante unità di ciascuna valuta valgono <b>1 USD</b>. Quando attiverai OANDA, si aggiorneranno da soli.</>}
        </span>
      </div>
      <div className="ratebox">
        {CCYS.map(x => (
          <div className="field" key={x}>
            <label>1 USD = {x}</label>
            <input type="number" step="0.0001" min="0"
              value={rates[x] ?? (x==="USD"?1:"")}
              readOnly={x==="USD" || oanda}
              onChange={e=>setRates(prev=>({ ...prev, [x]: parseFloat(e.target.value)||prev[x] }))} />
          </div>
        ))}
      </div>
      <div className="row-actions">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Salvataggio…" : "Salva impostazioni"}
        </button>
      </div>
    </div>
  );
}
