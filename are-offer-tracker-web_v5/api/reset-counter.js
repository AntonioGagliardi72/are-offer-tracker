import { sql } from "@vercel/postgres";
import { ensureSchema, checkAuth } from "./_lib.js";

/**
 * Azzera un singolo contatore. Il client passa { key } dove key è la parte
 * senza anno: "CON" | "SVC" | "SOL" | "PRT" | "INV" | "PO".
 * L'anno corrente viene aggiunto qui, così si azzera la serie dell'anno in corso
 * (es. CON-2026), che è quella che genera i numeri nuovi.
 */
const VALID = ["CON", "SVC", "SOL", "PRT", "INV", "PO"];

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "metodo non consentito" });
  try {
    await ensureSchema();
    const key = (req.body?.key || "").toUpperCase();
    if (!VALID.includes(key)) {
      return res.status(400).json({ error: "contatore non valido" });
    }
    const year = new Date().getFullYear();
    const counterId = `${key}-${year}`;
    // Riporta a 0: il prossimo numero generato sarà 0001.
    await sql`INSERT INTO counters (id, seq) VALUES (${counterId}, 0)
      ON CONFLICT (id) DO UPDATE SET seq = 0`;
    return res.status(200).json({ ok: true, counter: counterId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
