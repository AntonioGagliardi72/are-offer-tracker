// Vercel serverless function
// Reads ANTHROPIC_API_KEY from environment variables (set in Vercel project settings)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata su Vercel' })
    return
  }

  try {
    const { imageBase64, mediaType } = req.body

    if (!imageBase64) {
      res.status(400).json({ error: 'Immagine mancante' })
      return
    }

    const categories = [
      'flight', 'taxi', 'car_rental', 'toll', 'parking',
      'fuel', 'train', 'meals', 'hotel', 'other'
    ]

    const prompt = `Analyze this receipt for a business travel expense.
Return ONLY a valid JSON object, no extra text, no backticks, with these fields:
{
  "date": "YYYY-MM-DD (receipt date; use today's date if unreadable)",
  "amount": decimal number (only the final total paid, no currency symbols),
  "currency": "one of AED, USD, EUR (inferred from symbol/context, default AED)",
  "category": "one of: ${categories.join(', ')} (inferred from the type of merchant/receipt)",
  "note": "brief description: merchant/vendor name, max 60 characters"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64
                }
              },
              { type: 'text', text: prompt }
            ]
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      res.status(response.status).json({ error: data?.error?.message || 'Errore API Anthropic' })
      return
    }

    const textBlock = (data.content || []).find(b => b.type === 'text')
    let parsed
    try {
      const cleaned = (textBlock?.text || '').replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      res.status(502).json({ error: 'Risposta AI non interpretabile', raw: textBlock?.text })
      return
    }

    res.status(200).json(parsed)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Errore interno' })
  }
}
