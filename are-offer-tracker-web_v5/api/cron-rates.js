import { sql } from "@vercel/postgres";
import { ensureSchema } from "./_lib.js";

/**
 * Daily scheduled function (see vercel.json crons). Fetches USD->AED / USD->EUR
 * mid rates from OANDA and stores them in settings.
 *
 * It is intentionally a NO-OP until OANDA_API_KEY is configured in Vercel, so
 * the app deploys and runs perfectly with manual rates first. Add the key later
 * to switch the currency rates to automatic — nothing else needs to change.
 */
export default async function handler(req, res) {
  try {
    if (!process.env.OANDA_API_KEY) {
      return res.status(200).json({ skipped: "OANDA_API_KEY non configurata — cambi manuali attivi" });
    }
    await ensureSchema();

    const quotes = ["AED", "EUR"];
    const url =
      "https://exchange-rates-api.oanda.com/v2/rates/spot.json" +
      `?base=USD&quote=${quotes.join("&quote=")}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.OANDA_API_KEY}` },
    });
    if (!r.ok) {
      const body = await r.text();
      console.error("OANDA HTTP", r.status, body);
      return res.status(502).json({ error: `OANDA HTTP ${r.status}` });
    }
    const data = await r.json();

    // rates[ccy] = units of ccy per 1 USD (mid of bid/ask).
    const rates = { USD: 1 };
    for (const q of data.quotes || []) {
      const ccy = q.quote_currency || q.quote;
      const mid = q.midpoint !== undefined
        ? Number(q.midpoint)
        : (Number(q.bid) + Number(q.ask)) / 2;
      if (ccy && !Number.isNaN(mid)) rates[ccy] = mid;
    }
    for (const c of quotes) {
      if (!(c in rates)) {
        console.error("OANDA: rate mancante", c, rates);
        return res.status(502).json({ error: `manca ${c}` });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await sql`SELECT data FROM settings WHERE id='app'`;
    const current = rows[0]?.data || { base: "USD" };
    const merged = {
      ...current,
      rates: { ...(current.rates || {}), ...rates },
      ratesSource: "OANDA",
      ratesDate: today,
    };
    await sql`INSERT INTO settings (id, data) VALUES ('app', ${JSON.stringify(merged)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;

    return res.status(200).json({ ok: true, rates, date: today });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
