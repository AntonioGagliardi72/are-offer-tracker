import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_MAP, COMPANY, PREPARER } from '../constants.js'
import { fetchEurRates, toEUR } from '../utils/fx.js'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function slug(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toCSV(rows, rates) {
  const header = ['Date', 'Category', 'Amount', 'Currency', 'Amount (EUR)', 'Note']
  const lines = [header.join(',')]
  for (const r of rows) {
    const eur = toEUR(r.amount, r.currency, rates)
    const cols = [
      r.date,
      CATEGORY_MAP[r.category] || r.category,
      r.amount.toFixed(2),
      r.currency,
      eur != null ? eur.toFixed(2) : '',
      (r.note || '').replace(/"/g, "'").replace(/,/g, ';')
    ]
    lines.push(cols.join(','))
  }
  return lines.join('\n')
}

export default function ReportView({ mission, expenses }) {
  const [rates, setRates] = useState({ EUR: 1, USD: null, AED: null })
  const [rateSource, setRateSource] = useState('loading')
  const [fetchedAt, setFetchedAt] = useState(null)

  useEffect(() => { loadRates() }, [])

  async function loadRates() {
    setRateSource('loading')
    const { rates: r, source, fetchedAt: ts } = await fetchEurRates()
    setRates(r)
    setRateSource(source)
    setFetchedAt(ts)
  }

  function handleRateChange(currency, value) {
    setRates(r => ({ ...r, [currency]: value === '' ? null : parseFloat(value) }))
    setRateSource('manual')
  }

  const rows = useMemo(
    () => expenses.filter(e => e.missionId === mission.id).sort((a, b) => (a.date > b.date ? 1 : -1)),
    [expenses, mission.id]
  )

  const rowsWithEur = useMemo(
    () => rows.map(r => ({ ...r, eur: toEUR(r.amount, r.currency, rates) })),
    [rows, rates]
  )

  const totalEUR = useMemo(
    () => rowsWithEur.reduce((sum, r) => sum + (r.eur || 0), 0),
    [rowsWithEur]
  )

  const missingRate = rowsWithEur.some(r => r.eur == null)

  function downloadCSV() {
    const csv = toCSV(rows, rates)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `are-expenses-${slug(mission.name)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  const rateStatusLabel = {
    loading: 'Fetching live exchange rates…',
    live: fetchedAt ? `Live rates as of ${new Date(fetchedAt).toLocaleString('en-GB')}` : 'Live rates',
    cached: 'Could not reach the rate provider — using last known rates',
    fallback: 'Offline — using approximate fallback rates, please verify before submitting',
    manual: 'Manually adjusted rates'
  }[rateSource]

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{mission.name}</div>
        <div className="expense-meta">{fmt(mission.startDate)} → {fmt(mission.endDate)}</div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label style={{ marginTop: 0 }}>Exchange rates to EUR</label>
        <div className="row">
          <div>
            <label>1 EUR = ? USD</label>
            <input
              type="number" step="0.0001" min="0"
              value={rates.USD ?? ''}
              onChange={e => handleRateChange('USD', e.target.value)}
            />
          </div>
          <div>
            <label>1 EUR = ? AED</label>
            <input
              type="number" step="0.0001" min="0"
              value={rates.AED ?? ''}
              onChange={e => handleRateChange('AED', e.target.value)}
            />
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>{rateStatusLabel}</p>
        <button type="button" className="btn-secondary" style={{ marginTop: 0 }} onClick={loadRates}>
          ⟳ Refresh live rates
        </button>
        {missingRate && (
          <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>
            Some expenses are missing an exchange rate and are not included in the EUR total below.
          </p>
        )}
      </div>

      <div className="report-actions">
        <button onClick={downloadCSV}>⬇ Export CSV</button>
        <button onClick={printReport}>🖨 Print / PDF</button>
      </div>

      <div id="report-sheet">
        <div className="rep-header">
          <img src="/logo.png" alt="ARE" />
          <div>
            <p className="rep-company">{COMPANY.name}</p>
            <p className="rep-sub">
              {COMPANY.address}<br />
              License No. {COMPANY.licenseNo} &middot; Manager: {COMPANY.manager}
            </p>
          </div>
        </div>

        <h2>Expense Report &middot; {mission.name}</h2>
        <p className="rep-meta">
          Mission dates: {fmt(mission.startDate)} → {fmt(mission.endDate)}
          <br />
          Prepared by: {PREPARER.name} ({PREPARER.email})
          <br />
          Rates applied: 1 EUR = {rates.USD ?? '—'} USD &middot; 1 EUR = {rates.AED ?? '—'} AED
        </p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Note</th>
              <th className="num">Amount</th>
              <th>Ccy</th>
              <th className="num">Amount (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithEur.map(r => (
              <tr key={r.id}>
                <td>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td>{CATEGORY_MAP[r.category] || r.category}</td>
                <td>{r.note}</td>
                <td className="num">{r.amount.toFixed(2)}</td>
                <td>{r.currency}</td>
                <td className="num">{r.eur != null ? r.eur.toFixed(2) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ color: '#777' }}>No expenses for this mission.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="rep-total-row">
              <td colSpan={5}>TOTAL (EUR)</td>
              <td className="num">{totalEUR.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="rep-footer">
          {COMPANY.name} &middot; Report auto-generated by ARE Expenses for internal expense reimbursement purposes.
          All amounts converted to EUR at the exchange rates stated above.
        </div>
      </div>
    </div>
  )
}
