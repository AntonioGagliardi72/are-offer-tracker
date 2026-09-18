const CACHE_KEY = 'are-fx-rates-cache-v1'

// Approximate fallback rates (1 EUR = X units of currency), used only if
// both the live fetch and the cache are unavailable (e.g. fully offline
// on first use). Always double-check against a live source before
// submitting a reimbursement report.
const FALLBACK_RATES = { EUR: 1, USD: 1.08, AED: 3.97 }

// Rates are expressed as "1 EUR = rate[CUR] units of CUR"
export async function fetchEurRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR')
    const data = await res.json()
    if (!data.rates || (data.result && data.result !== 'success')) {
      throw new Error('Unexpected FX response')
    }
    const rates = { EUR: 1, USD: data.rates.USD, AED: data.rates.AED }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }))
    return { rates, source: 'live', fetchedAt: Date.now() }
  } catch (err) {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { rates, fetchedAt } = JSON.parse(cached)
      return { rates, source: 'cached', fetchedAt }
    }
    return { rates: FALLBACK_RATES, source: 'fallback', fetchedAt: null }
  }
}

// Convert an amount in `currency` into EUR using the given rates map.
// Returns null if the rate is missing so callers can flag it.
export function toEUR(amount, currency, rates) {
  if (currency === 'EUR') return amount
  const r = rates[currency]
  if (!r) return null
  return amount / r
}
