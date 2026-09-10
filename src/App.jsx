import React, { useEffect, useState } from "react";
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
const INV_STATUSES = ["Da pagare","Pagata","Scaduta"];
const INV_STYLE = {
  "Da pagare":{c:"#BA7517",b:"#FAEEDA"}, "Pagata":{c:"#1D9E75",b:"#E1F5EE"}, "Scaduta":{c:"#A32D2D",b:"#FCEBEB"},
};
const SO_STATUSES = ["Emesso","Confermato","Consegnato","Annullato"];
const SO_STYLE = {
  "Emesso":{c:"#185FA5",b:"#E6F1FB"}, "Confermato":{c:"#7F4AB7",b:"#EEEDFE"},
  "Consegnato":{c:"#1D9E75",b:"#E1F5EE"}, "Annullato":{c:"#A32D2D",b:"#FCEBEB"},
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

export default function App(){
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [offers, setOffers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [supplierOrders, setSupplierOrders] = useState([]);
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
    const [o, inv, so, s] = await Promise.all([
      api.fetchOffers(), api.fetchInvoices(), api.fetchSupplierOrders(), api.fetchSettings(),
    ]);
    setOffers(o); setInvoices(inv); setSupplierOrders(so); setSettings(s);
  }

  useEffect(() => {
    (async () => {
      if (api.getPw()) { try { await loadAll(); setAuthed(true); } catch { api.clearPw(); } }
      setReady(true);
    })();
  }, []);

  if (!ready) return <div className="spinner">Caricamento…</div>;
  if (!authed) return <Login onOk={async ()=>{ await loadAll(); setAuthed(true); }} />;

  const go = (v) => { if(!v.startsWith("new")) setEditId(null); setView(v); };
  const ctx = { offers, invoices, supplierOrders, settings, base, rates, toBase, baseMoney,
    showToast, reload: loadAll, setView, setEditId, editId, go };

  const TABS = [
    ["dashboard","Dashboard"],["new","+ Offerta"],["list","Offerte"],
    ["invoices","Fatture"],["suppliers","Ordini fornitori"],["settings","Impostazioni"],
  ];

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="logo">ARE</div>
          <div><h1>Offer Tracker</h1><span>Advanced Rotating Equipment FZE</span></div>
        </div>
        <div className="tabs">
          {TABS.map(([k,l]) => (
            <button key={k} className={"tab"+(view===k?" active":"")} onClick={()=>go(k)}>{l}</button>
          ))}
          <button className="signout" onClick={()=>{ api.clearPw(); setAuthed(false); }}>Esci</button>
        </div>
      </div>
      <div className="wrap">
        {view==="dashboard" && <Dashboard {...ctx} />}
        {view==="new" && <OfferForm {...ctx} />}
        {view==="list" && <OfferList {...ctx} />}
        {view==="invoices" && <Invoices {...ctx} />}
        {view==="suppliers" && <SupplierOrders {...ctx} />}
        {view==="settings" && <Settings {...ctx} setSettings={setSettings} />}
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

function Login({ onOk }){
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const ok = await api.login(pw);
    if (ok) { api.setPw(pw); try { await onOk(); } catch { setErr("Errore di caricamento"); } }
    else setErr("Password errata");
    setBusy(false);
  };
  return (
    <div id="login"><div className="loginbox">
      <div className="logo">ARE</div><h1>Offer Tracker</h1><p>Advanced Rotating Equipment FZE</p>
      <input type="password" placeholder="Password" value={pw}
        onChange={e=>setPw(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") submit(); }} autoFocus />
      <button className="btn btn-primary" style={{width:"100%"}} onClick={submit} disabled={busy}>
        {busy ? "Verifica…" : "Entra"}</button>
      <div className="err">{err}</div>
    </div></div>
  );
}

function Metric({lbl,val,sub}){
  return <div className="metric"><div className="lbl">{lbl}</div><div className="val">{val}</div><div className="sub">{sub}</div></div>;
}
function Field({label,full,children}){
  return <div className={"field"+(full?" full":"")}><label>{label}</label>{children}</div>;
}

function Dashboard({ offers, invoices, supplierOrders, base, toBase, baseMoney, settings, setView }){
  const total = offers.length;
  if (!total && !invoices.length && !supplierOrders.length) return (
    <div className="panel"><div className="empty">
      <div className="big">📋</div><p>Ancora nessun dato.</p><br/>
      <button className="btn btn-primary" onClick={()=>setView("new")}>Crea la prima offerta</button>
    </div></div>
  );

  const pipeline = offers.filter(o=>o.status==="Submitted").reduce((s,o)=>s+toBase(o.amount,o.currency),0);
  const won = offers.filter(o=>o.status==="Won");
  const wonVal = won.reduce((s,o)=>s+toBase(o.poFinal||o.amount,o.currency),0);
  const decided = offers.filter(o=>o.status==="Won"||o.status==="Lost").length;
  const winRate = decided ? Math.round(won.length/decided*100) : 0;

  const invoicedTot = invoices.reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const paidTot = invoices.filter(i=>i.status==="Pagata").reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const unpaidTot = invoices.filter(i=>i.status!=="Pagata").reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const supplierTot = supplierOrders.filter(o=>o.status!=="Annullato").reduce((s,o)=>s+toBase(o.amount,o.currency),0);

  const ck = Object.keys(CATS);
  const barData = {
    labels: ck.map(k=>CATS[k].label),
    datasets: [{ data: ck.map(k=>offers.filter(o=>o.category===k).reduce((s,o)=>s+toBase(o.amount,o.currency),0)),
      backgroundColor: ck.map(k=>CATS[k].color), borderRadius:6 }],
  };
  const barOpts = { responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}}, scales:{y:{ticks:{callback:v=>SYM[base]+(v/1000)+"k"}}} };
  const dData = { labels:INV_STATUSES,
    datasets:[{ data:INV_STATUSES.map(s=>invoices.filter(i=>i.status===s).reduce((a,i)=>a+toBase(i.amount,i.currency),0)),
      backgroundColor:INV_STATUSES.map(s=>INV_STYLE[s].c) }] };
  const dOpts = { responsive:true, maintainAspectRatio:false,
    plugins:{legend:{position:"bottom",labels:{padding:14,font:{size:12}}}} };

  const now = new Date(), soon = [];
  offers.forEach(o => [["Invio",o.subDue],["PO cliente",o.poDue]].forEach(([t,d])=>{
    if(d){ const diff=(new Date(d)-now)/86400000; if(diff>=-3&&diff<=30) soon.push({id:o.id,who:o.directCustomer,t,d,diff}); }
  }));
  invoices.forEach(i => { if(i.dueDate && i.status!=="Pagata"){ const diff=(new Date(i.dueDate)-now)/86400000;
    if(diff>=-30&&diff<=30) soon.push({id:i.id,who:"Fattura",t:"Pagamento",d:i.dueDate,diff}); } });
  soon.sort((a,b)=>new Date(a.d)-new Date(b.d));

  return (
    <>
      <div className="banner"><span>ℹ️</span><span>
        Valori in valuta base <b>{base}</b>{" "}
        {settings.ratesSource==="OANDA"
          ? <>con cambi OANDA{settings.ratesDate?` del ${settings.ratesDate}`:""}.</>
          : "con cambi manuali."} Modificabili in Impostazioni.
      </span></div>
      <div className="cards">
        <Metric lbl="Offerte" val={total} sub={`${won.length} vinte · ${winRate}% win`} />
        <Metric lbl="Pipeline aperta" val={baseMoney(pipeline)} sub="offerte inviate" />
        <Metric lbl="Valore vinto" val={baseMoney(wonVal)} sub={`${won.length} ordini`} />
        <Metric lbl="Fatturato" val={baseMoney(invoicedTot)} sub={`${invoices.length} fatture`} />
        <Metric lbl="Da incassare" val={baseMoney(unpaidTot)} sub={`incassato ${baseMoney(paidTot)}`} />
        <Metric lbl="Ordini fornitori" val={baseMoney(supplierTot)} sub={`${supplierOrders.length} ordini`} />
      </div>
      <div className="chartgrid">
        <div className="panel"><h2>Valore offerte per categoria ({base})</h2>
          <div style={{position:"relative",height:280}}><Bar data={barData} options={barOpts} /></div></div>
        <div className="panel"><h2>Fatture per stato ({base})</h2>
          <div style={{position:"relative",height:280}}><Doughnut data={dData} options={dOpts} /></div></div>
      </div>
      <div className="panel"><h2>Scadenze prossime (30 giorni)</h2>
        {soon.length ? (
          <table><thead><tr><th>Riferimento</th><th>Chi</th><th>Tipo</th><th>Scadenza</th><th>Giorni</th></tr></thead>
            <tbody>{soon.map((s,i)=>(
              <tr key={i}><td className="oid">{s.id}</td><td>{s.who||"—"}</td>
                <td>{s.t}</td><td className={dueClass(s.d)}>{s.d}</td>
                <td className={dueClass(s.d)}>{Math.round(s.diff)}g</td></tr>
            ))}</tbody></table>
        ) : <p style={{color:"var(--muted)",fontSize:13}}>Nessuna scadenza nei prossimi 30 giorni.</p>}
      </div>
    </>
  );
}

const OFFER_BLANK = {
  category:"consultancy", endUser:"", directCustomer:"", scope:"",
  amount:"", currency:"USD", status:"Draft", subDue:"", poDue:"", poFinal:"", pdfLink:"",
  customerPoNumber:"", customerPoDate:"", customerPoAmount:"",
};

function OfferForm({ offers, editId, showToast, reload, setView, setEditId }){
  const existing = editId ? offers.find(o=>o.id===editId) : null;
  // Fonde i valori esistenti su un set completo di campi: ogni campo (date
  // comprese) parte sempre valorizzato, così la modifica non azzera nulla.
  const [f, setF] = useState(existing ? { ...OFFER_BLANK, ...existing } : { ...OFFER_BLANK });
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(prev=>({ ...prev, [k]:v }));
  const isWon = f.status === "Won";

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
        L'Offer ID è assegnato automaticamente al salvataggio. Quando l'offerta è <b>vinta</b>,
        compaiono i campi per registrare il <b>PO ricevuto dal cliente</b>. Le fatture si creano poi dalla scheda Fatture.
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
          <Field label="Link PDF (offerta)" full>
            <input type="url" value={f.pdfLink} onChange={e=>set("pdfLink",e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>
        </div>

        {isWon && (
          <div style={{marginTop:8,paddingTop:16,borderTop:"1px solid var(--line)"}}>
            <h2 style={{fontSize:14}}>PO ricevuto dal cliente</h2>
            <div className="formgrid">
              <Field label="Numero PO cliente">
                <input value={f.customerPoNumber} onChange={e=>set("customerPoNumber",e.target.value)} placeholder="numero del cliente" />
              </Field>
              <Field label="Data PO cliente">
                <input type="date" value={f.customerPoDate||""} onChange={e=>set("customerPoDate",e.target.value)} />
              </Field>
              <Field label="Importo PO cliente">
                <input type="number" min="0" step="100" value={f.customerPoAmount} onChange={e=>set("customerPoAmount",e.target.value)} placeholder="0" />
              </Field>
            </div>
          </div>
        )}

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

function OfferList({ offers, invoices, showToast, reload, setEditId, setView }){
  const [q, setQ] = useState(""); const [fc, setFc] = useState(""); const [fs, setFs] = useState("");
  const rows = offers.filter(o => {
    if (fc && o.category!==fc) return false;
    if (fs && o.status!==fs) return false;
    if (q && !((o.id+" "+o.endUser+" "+o.directCustomer+" "+o.scope).toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const invCount = (offerId) => invoices.filter(i=>i.offerId===offerId).length;
  const del = async (id) => {
    if (!confirm("Eliminare l'offerta "+id+"? Verranno eliminate anche le sue fatture collegate.")) return;
    try { await api.deleteOffer(id); showToast("Eliminata"); await reload(); } catch { showToast("Errore eliminazione"); }
  };
  const exportCSV = () => {
    const h = ["Offer ID","Category","End user","Direct customer","Scope","Amount","Currency",
      "Status","Submission due","PO due","PO final","Customer PO n.","Customer PO date","Customer PO amount","PDF link"];
    const data = offers.map(o => [o.id, CATS[o.category].label, o.endUser, o.directCustomer, o.scope,
      o.amount, o.currency, o.status, o.subDue, o.poDue, o.poFinal,
      o.customerPoNumber, o.customerPoDate, o.customerPoAmount, o.pdfLink]);
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
          <option value="">Tutti gli stati</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Esporta CSV</button>
      </div>
      <div className="panel" style={{padding:0,overflowX:"auto"}}>
        {rows.length ? (
          <table><thead><tr>
            <th>Offer ID</th><th>Categoria</th><th>Cliente diretto</th><th>Importo</th><th>Stato</th>
            <th>PO cliente</th><th>Fatture</th><th>PDF</th><th></th>
          </tr></thead><tbody>{rows.map(o=>{
            const ct=CATS[o.category], st=STATUS_STYLE[o.status], n=invCount(o.id);
            return (
              <tr key={o.id}>
                <td className="oid">{o.id}</td>
                <td><span className="pill" style={{background:ct.bg,color:ct.color}}>{ct.label}</span></td>
                <td>{o.directCustomer||"—"}</td>
                <td>{money(o.amount,o.currency)}</td>
                <td><span className="pill" style={{background:st.b,color:st.c}}>{o.status}</span></td>
                <td>{o.customerPoNumber||"—"}</td>
                <td>{n?`${n} fattura${n>1?"e":""}`:"—"}</td>
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

function Invoices({ offers, invoices, showToast, reload, base, toBase }){
  const blank = { offerId:"", description:"", amount:"", currency:"USD", issueDate:"", dueDate:"", status:"Da pagare", pdfLink:"" };
  const [form, setForm] = useState(null); // null = chiuso, altrimenti oggetto in modifica/creazione
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setForm(prev=>({ ...prev, [k]:v }));

  const save = async () => {
    setBusy(true);
    try {
      await api.saveInvoice(form);
      showToast(form.id ? "Fattura aggiornata" : "Fattura salvata");
      await reload(); setForm(null);
    } catch(e){ showToast("Errore: "+e.message); } finally { setBusy(false); }
  };
  const del = async (id) => {
    if (!confirm("Eliminare la fattura "+id+"?")) return;
    try { await api.deleteInvoice(id); showToast("Eliminata"); await reload(); } catch { showToast("Errore"); }
  };
  const exportCSV = () => {
    const h=["Invoice ID","Offer ID","Descrizione","Importo","Valuta","Data emissione","Scadenza","Stato","PDF"];
    const data=invoices.map(i=>[i.id,i.offerId,i.description,i.amount,i.currency,i.issueDate,i.dueDate,i.status,i.pdfLink]);
    const csv=[h,...data].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="ARE_invoices.csv"; a.click(); showToast("CSV esportato");
  };

  return (
    <>
      {form ? (
        <div className="panel">
          <h2>{form.id ? "Modifica fattura "+form.id : "Nuova fattura"}</h2>
          <div className="banner"><span>ℹ️</span><span>L'ID fattura (ARE-INV-…) è assegnato automaticamente. Collega la fattura a un'offerta vinta.</span></div>
          <div className="formgrid">
            <Field label="Offerta collegata">
              <select value={form.offerId} onChange={e=>set("offerId",e.target.value)}>
                <option value="">— nessuna —</option>
                {offers.filter(o=>o.status==="Won"||o.id===form.offerId).map(o=>(
                  <option key={o.id} value={o.id}>{o.id} — {o.directCustomer||o.endUser||""}</option>
                ))}
              </select>
            </Field>
            <Field label="Fattura ID">
              <input readOnly value={form.id || "assegnato al salvataggio"} />
            </Field>
            <Field label="Descrizione" full>
              <input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="es. Acconto 30% / SAL 1" />
            </Field>
            <Field label="Importo">
              <div className="amtrow">
                <input type="number" min="0" step="100" value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="0" />
                <select value={form.currency} onChange={e=>set("currency",e.target.value)}>
                  {CCYS.map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
            </Field>
            <Field label="Stato">
              <select value={form.status} onChange={e=>set("status",e.target.value)}>
                {INV_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Data emissione">
              <input type="date" value={form.issueDate||""} onChange={e=>set("issueDate",e.target.value)} />
            </Field>
            <Field label="Scadenza pagamento">
              <input type="date" value={form.dueDate||""} onChange={e=>set("dueDate",e.target.value)} />
            </Field>
            <Field label="Link PDF (fattura)" full>
              <input type="url" value={form.pdfLink} onChange={e=>set("pdfLink",e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy?"Salvataggio…":(form.id?"Aggiorna":"Salva fattura")}</button>
            <button className="btn btn-ghost" onClick={()=>setForm(null)}>Annulla</button>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <button className="btn btn-primary btn-sm" onClick={()=>setForm({...blank})}>+ Nuova fattura</button>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Esporta CSV</button>
            <span className="hint">Totale fatture: {invoices.length}</span>
          </div>
          <div className="panel" style={{padding:0,overflowX:"auto"}}>
            {invoices.length ? (
              <table><thead><tr>
                <th>Fattura ID</th><th>Offerta</th><th>Descrizione</th><th>Importo</th>
                <th>Emissione</th><th>Scadenza</th><th>Stato</th><th>PDF</th><th></th>
              </tr></thead><tbody>{invoices.map(i=>{
                const st=INV_STYLE[i.status]||INV_STYLE["Da pagare"];
                return (
                  <tr key={i.id}>
                    <td className="oid">{i.id}</td>
                    <td className="oid" style={{fontSize:11}}>{i.offerId||"—"}</td>
                    <td>{i.description||"—"}</td>
                    <td>{money(i.amount,i.currency)}</td>
                    <td>{i.issueDate||"—"}</td>
                    <td className={i.status!=="Pagata"?dueClass(i.dueDate):""}>{i.dueDate||"—"}</td>
                    <td><span className="pill" style={{background:st.b,color:st.c}}>{i.status}</span></td>
                    <td>{i.pdfLink ? <a className="doc" href={i.pdfLink} target="_blank" rel="noreferrer">📄</a> : "—"}</td>
                    <td style={{whiteSpace:"nowrap"}}>
                      <button className="link" onClick={()=>setForm({...blank, ...i})}>Modifica</button>
                      <button className="link del" onClick={()=>del(i.id)}>Elimina</button>
                    </td>
                  </tr>
                );
              })}</tbody></table>
            ) : <div className="empty"><p>Ancora nessuna fattura. Creane una con "+ Nuova fattura".</p></div>}
          </div>
        </>
      )}
    </>
  );
}

function SupplierOrders({ supplierOrders, showToast, reload }){
  const blank = { supplier:"", quoteNumber:"", description:"", amount:"", currency:"USD", orderDate:"", expectedDate:"", status:"Emesso", pdfLink:"" };
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setForm(prev=>({ ...prev, [k]:v }));

  const save = async () => {
    setBusy(true);
    try {
      await api.saveSupplierOrder(form);
      showToast(form.id ? "Ordine aggiornato" : "Ordine salvato");
      await reload(); setForm(null);
    } catch(e){ showToast("Errore: "+e.message); } finally { setBusy(false); }
  };
  const del = async (id) => {
    if (!confirm("Eliminare l'ordine "+id+"?")) return;
    try { await api.deleteSupplierOrder(id); showToast("Eliminato"); await reload(); } catch { showToast("Errore"); }
  };
  const exportCSV = () => {
    const h=["Order ID","Fornitore","N. quotazione","Descrizione","Importo","Valuta","Data ordine","Consegna prevista","Stato","PDF"];
    const data=supplierOrders.map(o=>[o.id,o.supplier,o.quoteNumber,o.description,o.amount,o.currency,o.orderDate,o.expectedDate,o.status,o.pdfLink]);
    const csv=[h,...data].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="ARE_supplier_orders.csv"; a.click(); showToast("CSV esportato");
  };

  return (
    <>
      {form ? (
        <div className="panel">
          <h2>{form.id ? "Modifica ordine "+form.id : "Nuovo ordine a fornitore"}</h2>
          <div className="banner"><span>ℹ️</span><span>L'ID ordine (ARE-PO-…) è assegnato automaticamente da te. Registra il numero di quotazione ricevuto dal fornitore.</span></div>
          <div className="formgrid">
            <Field label="Fornitore">
              <input value={form.supplier} onChange={e=>set("supplier",e.target.value)} placeholder="nome fornitore" />
            </Field>
            <Field label="Ordine ID">
              <input readOnly value={form.id || "assegnato al salvataggio"} />
            </Field>
            <Field label="N. quotazione ricevuta">
              <input value={form.quoteNumber} onChange={e=>set("quoteNumber",e.target.value)} placeholder="numero del fornitore" />
            </Field>
            <Field label="Stato">
              <select value={form.status} onChange={e=>set("status",e.target.value)}>
                {SO_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Descrizione" full>
              <input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="cosa ordini" />
            </Field>
            <Field label="Importo">
              <div className="amtrow">
                <input type="number" min="0" step="100" value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="0" />
                <select value={form.currency} onChange={e=>set("currency",e.target.value)}>
                  {CCYS.map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
            </Field>
            <Field label="Data ordine">
              <input type="date" value={form.orderDate||""} onChange={e=>set("orderDate",e.target.value)} />
            </Field>
            <Field label="Consegna prevista">
              <input type="date" value={form.expectedDate||""} onChange={e=>set("expectedDate",e.target.value)} />
            </Field>
            <Field label="Link PDF (ordine)" full>
              <input type="url" value={form.pdfLink} onChange={e=>set("pdfLink",e.target.value)} placeholder="https://..." />
            </Field>
          </div>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy?"Salvataggio…":(form.id?"Aggiorna":"Salva ordine")}</button>
            <button className="btn btn-ghost" onClick={()=>setForm(null)}>Annulla</button>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <button className="btn btn-primary btn-sm" onClick={()=>setForm({...blank})}>+ Nuovo ordine</button>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Esporta CSV</button>
            <span className="hint">Totale ordini: {supplierOrders.length}</span>
          </div>
          <div className="panel" style={{padding:0,overflowX:"auto"}}>
            {supplierOrders.length ? (
              <table><thead><tr>
                <th>Ordine ID</th><th>Fornitore</th><th>N. quotazione</th><th>Descrizione</th><th>Importo</th>
                <th>Data ordine</th><th>Consegna</th><th>Stato</th><th>PDF</th><th></th>
              </tr></thead><tbody>{supplierOrders.map(o=>{
                const st=SO_STYLE[o.status]||SO_STYLE["Emesso"];
                return (
                  <tr key={o.id}>
                    <td className="oid">{o.id}</td>
                    <td>{o.supplier||"—"}</td>
                    <td>{o.quoteNumber||"—"}</td>
                    <td>{o.description||"—"}</td>
                    <td>{money(o.amount,o.currency)}</td>
                    <td>{o.orderDate||"—"}</td>
                    <td className={dueClass(o.expectedDate)}>{o.expectedDate||"—"}</td>
                    <td><span className="pill" style={{background:st.b,color:st.c}}>{o.status}</span></td>
                    <td>{o.pdfLink ? <a className="doc" href={o.pdfLink} target="_blank" rel="noreferrer">📄</a> : "—"}</td>
                    <td style={{whiteSpace:"nowrap"}}>
                      <button className="link" onClick={()=>setForm({...blank, ...o})}>Modifica</button>
                      <button className="link del" onClick={()=>del(o.id)}>Elimina</button>
                    </td>
                  </tr>
                );
              })}</tbody></table>
            ) : <div className="empty"><p>Ancora nessun ordine a fornitori. Creane uno con "+ Nuovo ordine".</p></div>}
          </div>
        </>
      )}
    </>
  );
}

function Settings({ settings, base, showToast, setView, setSettings }){
  const [b, setB] = useState(base);
  const [rates, setRates] = useState(settings.rates || {USD:1,AED:3.6725,EUR:0.92});
  const [busy, setBusy] = useState(false);
  const oanda = settings.ratesSource === "OANDA";
  const save = async () => {
    setBusy(true);
    try {
      const saved = await api.saveSettings({ base:b, rates:{ ...rates, USD:1 } });
      setSettings(saved); showToast("Impostazioni salvate"); setView("dashboard");
    } catch(e){ showToast("Errore: "+e.message); setBusy(false); }
  };
  return (
    <div className="panel">
      <h2>Impostazioni valuta</h2>
      <div className="field" style={{maxWidth:240}}>
        <label>Valuta base (totali cruscotto)</label>
        <select value={b} onChange={e=>setB(e.target.value)}>{CCYS.map(x=><option key={x}>{x}</option>)}</select>
      </div>
      <div className="banner" style={{marginTop:18}}>
        <span>{oanda?"🔄":"✏️"}</span>
        <span>{oanda
          ? <>Cambi aggiornati automaticamente da <b>OANDA</b>{settings.ratesDate?` (ultimo: ${settings.ratesDate})`:""}, di sola lettura.</>
          : <>Cambi <b>manuali</b>: quante unità di ogni valuta valgono <b>1 USD</b>.</>}
        </span>
      </div>
      <div className="ratebox">
        {CCYS.map(x => (
          <div className="field" key={x}>
            <label>1 USD = {x}</label>
            <input type="number" step="0.0001" min="0" value={rates[x] ?? (x==="USD"?1:"")}
              readOnly={x==="USD" || oanda}
              onChange={e=>setRates(prev=>({ ...prev, [x]: parseFloat(e.target.value)||prev[x] }))} />
          </div>
        ))}
      </div>
      <div className="row-actions">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy?"Salvataggio…":"Salva impostazioni"}</button>
      </div>

      <div style={{marginTop:28,paddingTop:20,borderTop:"1px solid var(--line)"}}>
        <CounterReset showToast={showToast} />
      </div>
    </div>
  );
}

function CounterReset({ showToast }){
  const year = new Date().getFullYear();
  const COUNTERS = [
    ["CON", `Offerte Consultancy (ARE-CON-${year})`],
    ["SVC", `Offerte Service (ARE-SVC-${year})`],
    ["SOL", `Offerte Solutions (ARE-SOL-${year})`],
    ["PRT", `Offerte Parts (ARE-PRT-${year})`],
    ["INV", `Fatture (ARE-INV-${year})`],
    ["PO",  `Ordini fornitori (ARE-PO-${year})`],
  ];
  const [key, setKey] = useState("CON");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const label = COUNTERS.find(c=>c[0]===key)?.[1] || key;
    if (!confirm(
      `Azzerare il contatore "${label}"?\n\n` +
      `Il prossimo numero generato ripartirà da 0001.\n` +
      `Attenzione: se esistono ancora elementi con quella numerazione, ` +
      `potresti ottenere numeri doppi. Procedere?`
    )) return;
    setBusy(true);
    try {
      await api.resetCounter(key);
      showToast("Contatore azzerato: riparte da 0001");
    } catch(e){ showToast("Errore: "+e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <h2>Azzera contatori</h2>
      <div className="banner" style={{background:"#FAEEDA",color:"#BA7517",borderColor:"#EAD9B5"}}>
        <span>⚠️</span>
        <span>Da usare solo dopo aver cancellato dei dati per ricominciare puliti.
        Azzerando, la prossima creazione di quel tipo riparte da <b>0001</b>.
        Non tocca gli elementi esistenti.</span>
      </div>
      <div className="field" style={{maxWidth:340}}>
        <label>Quale contatore azzerare</label>
        <select value={key} onChange={e=>setKey(e.target.value)}>
          {COUNTERS.map(([k,l])=><option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="row-actions">
        <button className="btn btn-ghost" style={{borderColor:"#E0B4B4",color:"#A32D2D"}}
          onClick={run} disabled={busy}>{busy?"Azzeramento…":"Azzera contatore selezionato"}</button>
      </div>
    </>
  );
}
