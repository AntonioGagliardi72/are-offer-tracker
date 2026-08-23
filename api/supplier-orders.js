import { sql } from "@vercel/postgres";
import { ensureSchema, checkAuth, nextSupplierOrderId } from "./_lib.js";

const clean = (v) => (v === "" || v === undefined ? null : v);

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    await ensureSchema();

    if (req.method === "GET") {
      const { rows } = await sql`SELECT * FROM supplier_orders ORDER BY created_at DESC`;
      return res.status(200).json({ orders: rows.map(toClient) });
    }

    if (req.method === "POST") {
      const o = req.body || {};
      let id = o.id;
      if (!id) {
        id = await nextSupplierOrderId();
        await sql`INSERT INTO supplier_orders
          (id, supplier, quote_number, description, amount, currency,
           order_date, expected_date, status, pdf_link)
          VALUES (${id}, ${o.supplier || ""}, ${o.quoteNumber || ""}, ${o.description || ""},
           ${Number(o.amount) || 0}, ${o.currency || "USD"}, ${clean(o.orderDate)},
           ${clean(o.expectedDate)}, ${o.status || "Emesso"}, ${o.pdfLink || ""})`;
      } else {
        await sql`UPDATE supplier_orders SET
           supplier=${o.supplier || ""}, quote_number=${o.quoteNumber || ""},
           description=${o.description || ""}, amount=${Number(o.amount) || 0},
           currency=${o.currency || "USD"}, order_date=${clean(o.orderDate)},
           expected_date=${clean(o.expectedDate)}, status=${o.status || "Emesso"},
           pdf_link=${o.pdfLink || ""}
           WHERE id=${id}`;
      }
      const { rows } = await sql`SELECT * FROM supplier_orders WHERE id=${id}`;
      return res.status(200).json({ order: toClient(rows[0]) });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id mancante" });
      await sql`DELETE FROM supplier_orders WHERE id=${id}`;
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
    supplier: r.supplier || "",
    quoteNumber: r.quote_number || "",
    description: r.description || "",
    amount: Number(r.amount) || 0,
    currency: r.currency || "USD",
    orderDate: d(r.order_date),
    expectedDate: d(r.expected_date),
    status: r.status || "Emesso",
    pdfLink: r.pdf_link || "",
  };
}
