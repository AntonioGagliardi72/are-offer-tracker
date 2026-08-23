// Small fetch wrapper. The personal password is kept in localStorage and sent
// on every request as the x-app-password header.
const PW_KEY = "are_pw";

export const getPw = () => localStorage.getItem(PW_KEY) || "";
export const setPw = (pw) => localStorage.setItem(PW_KEY, pw);
export const clearPw = () => localStorage.removeItem(PW_KEY);

function headers() {
  return { "Content-Type": "application/json", "x-app-password": getPw() };
}

export async function login(password) {
  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return r.ok;
}

export async function fetchOffers() {
  const r = await fetch("/api/offers", { headers: headers() });
  if (r.status === 401) throw new Error("unauthorized");
  const d = await r.json();
  return d.offers || [];
}

export async function saveOffer(offer) {
  const r = await fetch("/api/offers", {
    method: "POST", headers: headers(), body: JSON.stringify(offer),
  });
  if (!r.ok) throw new Error((await r.json()).error || "errore salvataggio");
  return (await r.json()).offer;
}

export async function deleteOffer(id) {
  const r = await fetch(`/api/offers?id=${encodeURIComponent(id)}`, {
    method: "DELETE", headers: headers(),
  });
  if (!r.ok) throw new Error("errore eliminazione");
}

export async function fetchSettings() {
  const r = await fetch("/api/settings", { headers: headers() });
  if (r.status === 401) throw new Error("unauthorized");
  return await r.json();
}

export async function saveSettings(settings) {
  const r = await fetch("/api/settings", {
    method: "POST", headers: headers(), body: JSON.stringify(settings),
  });
  if (!r.ok) throw new Error("errore salvataggio impostazioni");
  return await r.json();
}

// ---- Fatture ----
export async function fetchInvoices() {
  const r = await fetch("/api/invoices", { headers: headers() });
  if (r.status === 401) throw new Error("unauthorized");
  return (await r.json()).invoices || [];
}
export async function saveInvoice(inv) {
  const r = await fetch("/api/invoices", {
    method: "POST", headers: headers(), body: JSON.stringify(inv),
  });
  if (!r.ok) throw new Error((await r.json()).error || "errore salvataggio fattura");
  return (await r.json()).invoice;
}
export async function deleteInvoice(id) {
  const r = await fetch(`/api/invoices?id=${encodeURIComponent(id)}`, {
    method: "DELETE", headers: headers(),
  });
  if (!r.ok) throw new Error("errore eliminazione fattura");
}

// ---- Ordini a fornitori ----
export async function fetchSupplierOrders() {
  const r = await fetch("/api/supplier-orders", { headers: headers() });
  if (r.status === 401) throw new Error("unauthorized");
  return (await r.json()).orders || [];
}
export async function saveSupplierOrder(o) {
  const r = await fetch("/api/supplier-orders", {
    method: "POST", headers: headers(), body: JSON.stringify(o),
  });
  if (!r.ok) throw new Error((await r.json()).error || "errore salvataggio ordine");
  return (await r.json()).order;
}
export async function deleteSupplierOrder(id) {
  const r = await fetch(`/api/supplier-orders?id=${encodeURIComponent(id)}`, {
    method: "DELETE", headers: headers(),
  });
  if (!r.ok) throw new Error("errore eliminazione ordine");
}
