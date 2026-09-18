import { sql } from "@vercel/postgres";
import { ensureSchema, checkAuth } from "./_lib.js";

const DEFAULTS = {
  base: "USD",
  rates: { USD: 1, AED: 3.6725, EUR: 0.92 }, // units per 1 USD
  ratesSource: "manual",
  ratesDate: null,
};

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    await ensureSchema();

    if (req.method === "GET") {
      const { rows } = await sql`SELECT data FROM settings WHERE id='app'`;
      return res.status(200).json(rows[0]?.data || DEFAULTS);
    }

    if (req.method === "POST") {
      const incoming = req.body || {};
      // Preserve any OANDA-provided fields we aren't overwriting.
      const { rows } = await sql`SELECT data FROM settings WHERE id='app'`;
      const current = rows[0]?.data || DEFAULTS;
      const merged = {
        ...current,
        ...incoming,
        rates: { ...current.rates, ...(incoming.rates || {}) },
      };
      await sql`INSERT INTO settings (id, data) VALUES ('app', ${JSON.stringify(merged)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
      return res.status(200).json(merged);
    }

    return res.status(405).json({ error: "metodo non consentito" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
