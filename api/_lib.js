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
// The password is sent by the client in the x-app-password header and
// compared to the APP_PASSWORD environment variable set in Vercel.
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

// Atomic ID sequencing via a single upsert — no race conditions.
export async function nextOfferId(category) {
  const code = CAT_CODE[category] || "GEN";
  const year = new Date().getFullYear();
  const counterId = `${code}-${year}`;
  const { rows } = await sql`
    INSERT INTO counters (id, seq) VALUES (${counterId}, 1)
    ON CONFLICT (id) DO UPDATE SET seq = counters.seq + 1
    RETURNING seq`;
  const seq = String(rows[0].seq).padStart(4, "0");
  return `ARE-${code}-${year}-${seq}`;
}
