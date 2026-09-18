import { sql } from "@vercel/postgres";
import { ensureSchema, checkAuth, nextOfferId } from "./_lib.js";

const clean = (v) => (v === "" || v === undefined ? null : v);

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    await ensureSchema();

    // ---- LIST ----
    if (req.method === "GET") {
      const { rows } = await sql`SELECT * FROM offers ORDER BY created_at DESC`;
      return res.status(200).json({ offers: rows.map(toClient) });
    }

    // ---- CREATE / UPDATE ----
    if (req.method === "POST") {
      const o = req.body || {};
      let id = o.id;

      if (!id) {
        id = await nextOfferId(o.category);
        await sql`INSERT INTO offers
          (id, category, end_user, direct_customer, scope, amount, currency,
           status, sub_due, po_due, po_final, pdf_link,
           customer_po_number, customer_po_date, customer_po_amount)
          VALUES (${id}, ${o.category}, ${o.endUser || ""}, ${o.directCustomer || ""},
           ${o.scope || ""}, ${Number(o.amount) || 0}, ${o.currency || "USD"},
           ${o.status || "Draft"}, ${clean(o.subDue)}, ${clean(o.poDue)},
           ${Number(o.poFinal) || 0}, ${o.pdfLink || ""},
           ${o.customerPoNumber || ""}, ${clean(o.customerPoDate)}, ${Number(o.customerPoAmount) || 0})`;
      } else {
        await sql`UPDATE offers SET
           category=${o.category}, end_user=${o.endUser || ""},
           direct_customer=${o.directCustomer || ""}, scope=${o.scope || ""},
           amount=${Number(o.amount) || 0}, currency=${o.currency || "USD"},
           status=${o.status || "Draft"}, sub_due=${clean(o.subDue)},
           po_due=${clean(o.poDue)}, po_final=${Number(o.poFinal) || 0},
           pdf_link=${o.pdfLink || ""},
           customer_po_number=${o.customerPoNumber || ""},
           customer_po_date=${clean(o.customerPoDate)},
           customer_po_amount=${Number(o.customerPoAmount) || 0}
           WHERE id=${id}`;
      }
      const { rows } = await sql`SELECT * FROM offers WHERE id=${id}`;
      return res.status(200).json({ offer: toClient(rows[0]) });
    }

    // ---- DELETE ----
    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id mancante" });
      await sql`DELETE FROM offers WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "metodo non consentito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

function toClient(r) {
  const d = (v) => {
    if (!v) return "";
    if (v instanceof Date) {
      const y = v.getUTCFullYear();
      const m = String(v.getUTCMonth() + 1).padStart(2, "0");
      const day = String(v.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    return String(v).slice(0, 10);
  };
  return {
    id: r.id,
    category: r.category,
    endUser: r.end_user || "",
    directCustomer: r.direct_customer || "",
    scope: r.scope || "",
    amount: Number(r.amount) || 0,
    currency: r.currency || "USD",
    status: r.status || "Draft",
    subDue: d(r.sub_due),
    poDue: d(r.po_due),
    poFinal: Number(r.po_final) || 0,
    pdfLink: r.pdf_link || "",
    customerPoNumber: r.customer_po_number || "",
    customerPoDate: d(r.customer_po_date),
    customerPoAmount: Number(r.customer_po_amount) || 0,
  };
}
