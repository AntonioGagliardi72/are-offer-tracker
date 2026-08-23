import { sql } from "@vercel/postgres";
import { ensureSchema, checkAuth, nextInvoiceId } from "./_lib.js";

const clean = (v) => (v === "" || v === undefined ? null : v);

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    await ensureSchema();

    if (req.method === "GET") {
      const { rows } = await sql`SELECT * FROM invoices ORDER BY created_at DESC`;
      return res.status(200).json({ invoices: rows.map(toClient) });
    }

    if (req.method === "POST") {
      const o = req.body || {};
      let id = o.id;
      if (!id) {
        id = await nextInvoiceId();
        await sql`INSERT INTO invoices
          (id, offer_id, description, amount, currency, issue_date, due_date, status, pdf_link)
          VALUES (${id}, ${clean(o.offerId)}, ${o.description || ""}, ${Number(o.amount) || 0},
           ${o.currency || "USD"}, ${clean(o.issueDate)}, ${clean(o.dueDate)},
           ${o.status || "Da pagare"}, ${o.pdfLink || ""})`;
      } else {
        await sql`UPDATE invoices SET
           offer_id=${clean(o.offerId)}, description=${o.description || ""},
           amount=${Number(o.amount) || 0}, currency=${o.currency || "USD"},
           issue_date=${clean(o.issueDate)}, due_date=${clean(o.dueDate)},
           status=${o.status || "Da pagare"}, pdf_link=${o.pdfLink || ""}
           WHERE id=${id}`;
      }
      const { rows } = await sql`SELECT * FROM invoices WHERE id=${id}`;
      return res.status(200).json({ invoice: toClient(rows[0]) });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id mancante" });
      await sql`DELETE FROM invoices WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "metodo non consentito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

function toClient(r) {
  const d = (v) => (v ? String(v).slice(0, 10) : "");
  return {
    id: r.id,
    offerId: r.offer_id || "",
    description: r.description || "",
    amount: Number(r.amount) || 0,
    currency: r.currency || "USD",
    issueDate: d(r.issue_date),
    dueDate: d(r.due_date),
    status: r.status || "Da pagare",
    pdfLink: r.pdf_link || "",
  };
}
