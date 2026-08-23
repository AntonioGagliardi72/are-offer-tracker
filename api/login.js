// POST { password } -> { ok: true } if it matches APP_PASSWORD.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "metodo non consentito" });
  const password = req.body?.password;
  if (!process.env.APP_PASSWORD) {
    return res.status(500).json({ ok: false, error: "APP_PASSWORD non configurata su Vercel" });
  }
  if (password === process.env.APP_PASSWORD) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false });
}
