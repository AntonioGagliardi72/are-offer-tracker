import { sql } from "@vercel/postgres";

// Idempotent schema creation. Cheap enough to run on each cold start.
let schemaReady = false;
export async function ensureSchema() {
  if (schemaReady) return;

  await sql`CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    end_user TEXT DEFAULT '',
    direct_customer TEXT DEFAULT '',
    scope TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'Draft',
    sub_due DATE,
    po_due DATE,
    po_final NUMERIC DEFAULT 0,
    pdf_link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;

  // Customer PO received against a won offer (numero cliente, non generato da noi).
  await sql`ALTER TABLE offers ADD COLUMN IF NOT EXISTS customer_po_number TEXT DEFAULT ''`;
  await sql`ALTER TABLE offers ADD COLUMN IF NOT EXISTS customer_po_date DATE`;
  await sql`ALTER TABLE offers ADD COLUMN IF NOT EXISTS customer_po_amount NUMERIC DEFAULT 0`;

  // Fatture emesse da noi, collegate a un'offerta (più fatture per offerta).
  await sql`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    offer_id TEXT REFERENCES offers(id) ON DELETE CASCADE,
    description TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    issue_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'Da pagare',
    pdf_link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;

  // Ordini emessi da noi verso fornitori (sezione indipendente).
  await sql`CREATE TABLE IF NOT EXISTS supplier_orders (
    id TEXT PRIMARY KEY,
    supplier TEXT DEFAULT '',
    quote_number TEXT DEFAULT '',
    description TEXT DEFAULT '',
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    order_date DATE,
    expected_date DATE,
    status TEXT DEFAULT 'Emesso',
    pdf_link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS counters (
    id TEXT PRIMARY KEY,
    seq INT NOT NULL DEFAULT 0
  )`;
  await sql`CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
  )`;
  schemaReady = true;
}

// Simple shared-password gate, suitable for a single personal user.
export function checkAuth(req, res) {
  const pw = req.headers["x-app-password"];
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    res.status(401).json({ error: "non autorizzato" });
    return false;
  }
  return true;
}

export const CAT_CODE = {
  consultancy: "CON", service: "SVC", solutions: "SOL", parts: "PRT",
};

// Atomic sequencing for any prefixed series (offers, invoices, supplier orders).
export async function nextSeq(counterKey) {
  const { rows } = await sql`
    INSERT INTO counters (id, seq) VALUES (${counterKey}, 1)
    ON CONFLICT (id) DO UPDATE SET seq = counters.seq + 1
    RETURNING seq`;
  return rows[0].seq;
}

export async function nextOfferId(category) {
  const code = CAT_CODE[category] || "GEN";
  const year = new Date().getFullYear();
  const seq = await nextSeq(`${code}-${year}`);
  return `ARE-${code}-${year}-${String(seq).padStart(4, "0")}`;
}

export async function nextInvoiceId() {
  const year = new Date().getFullYear();
  const seq = await nextSeq(`INV-${year}`);
  return `ARE-INV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function nextSupplierOrderId() {
  const year = new Date().getFullYear();
  const seq = await nextSeq(`PO-${year}`);
  return `ARE-PO-${year}-${String(seq).padStart(4, "0")}`;
}
