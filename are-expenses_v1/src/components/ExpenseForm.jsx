import { useRef, useState } from 'react'
import { CATEGORIES, CURRENCIES } from '../constants.js'
import { saveExpense } from '../db.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  category: '',
  date: todayStr(),
  amount: '',
  currency: 'AED',
  note: '',
  receipt: null // { dataUrl, mediaType }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ExpenseForm({ missionId, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const fileInputRef = useRef(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanError('')

    const dataUrl = await fileToBase64(file)
    set('receipt', { dataUrl, mediaType: file.type })

    // Auto-scan via AI
    setScanning(true)
    try {
      const base64 = dataUrl.split(',')[1]
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')

      setForm(f => ({
        ...f,
        category: CATEGORIES.some(c => c.id === data.category) ? data.category : f.category,
        date: data.date || f.date,
        amount: data.amount != null ? String(data.amount) : f.amount,
        currency: CURRENCIES.includes(data.currency) ? data.currency : f.currency,
        note: data.note || f.note
      }))
    } catch (err) {
      setScanError('AI scan failed: please fill in the fields manually. (' + err.message + ')')
    } finally {
      setScanning(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.category || !form.amount || !form.date) return

    const expense = {
      id: crypto.randomUUID(),
      missionId,
      category: form.category,
      date: form.date,
      amount: parseFloat(form.amount),
      currency: form.currency,
      note: form.note.trim(),
      receipt: form.receipt,
      createdAt: new Date().toISOString()
    }
    await saveExpense(expense)
    setForm(emptyForm)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onSaved?.()
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        type="button"
        className="btn-ai"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
      >
        {scanning ? 'Analyzing receipt…' : '📷 Take / upload receipt (AI auto-fill)'}
      </button>
      {scanError && <p style={{ color: '#f87171', fontSize: 12 }}>{scanError}</p>}
      {form.receipt && !scanning && (
        <img
          src={form.receipt.dataUrl}
          alt="receipt"
          style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, marginTop: 6 }}
        />
      )}

      <label>Expense category</label>
      <div className="cat-grid">
        {CATEGORIES.map(c => (
          <button
            type="button"
            key={c.id}
            className={'cat-btn' + (form.category === c.id ? ' active' : '')}
            onClick={() => set('category', c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="row">
        <div>
          <label>Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
      </div>

      <div className="row">
        <div>
          <label>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            required
          />
        </div>
        <div>
          <label>Currency</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <label>Notes {form.category === 'other' && '(required for "Other")'}</label>
      <textarea
        rows={2}
        placeholder="Details, vendor, reason for travel…"
        value={form.note}
        onChange={e => set('note', e.target.value)}
        required={form.category === 'other'}
      />

      <button type="submit" className="btn-primary">Save expense</button>
    </form>
  )
}
