import { useMemo, useState } from 'react'
import { saveMission, deleteMission } from '../db.js'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const emptyForm = { name: '', startDate: '', endDate: '' }

export default function Missions({ missions, expenses, currentMissionId, onSelect, onChanged }) {
  const [showForm, setShowForm] = useState(missions.length === 0)
  const [form, setForm] = useState(emptyForm)

  const countsByMission = useMemo(() => {
    const m = {}
    for (const e of expenses) m[e.missionId] = (m[e.missionId] || 0) + 1
    return m
  }, [expenses])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.startDate || !form.endDate) return

    const mission = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      createdAt: new Date().toISOString()
    }
    await saveMission(mission)
    setForm(emptyForm)
    setShowForm(false)
    await onChanged?.()
    onSelect(mission.id)
  }

  async function handleDelete(id, name) {
    const n = countsByMission[id] || 0
    const msg = n > 0
      ? `Delete mission "${name}" and its ${n} expense(s)? This cannot be undone.`
      : `Delete mission "${name}"?`
    if (!confirm(msg)) return
    await deleteMission(id)
    await onChanged?.()
  }

  return (
    <div>
      {!showForm && (
        <button type="button" className="btn-primary" style={{ marginTop: 0, marginBottom: 14 }} onClick={() => setShowForm(true)}>
          + New mission
        </button>
      )}

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <label style={{ marginTop: 0 }}>Mission name</label>
          <input
            type="text"
            placeholder="e.g. Baku site visit — October"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
          />
          <div className="row">
            <div>
              <label>Start date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required />
            </div>
            <div>
              <label>End date</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-primary">Create mission</button>
          {missions.length > 0 && (
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          )}
        </form>
      )}

      <div className="card" style={{ padding: missions.length ? 8 : 16 }}>
        {missions.length === 0 && (
          <div className="empty-state">No missions yet. Create one above to start logging expenses.</div>
        )}
        {missions.map(m => (
          <div
            key={m.id}
            className={'mission-card' + (m.id === currentMissionId ? ' active' : '')}
            onClick={() => onSelect(m.id)}
          >
            <div className="mission-left">
              <span className="mission-name">{m.name}</span>
              <span className="expense-meta">
                {fmt(m.startDate)} → {fmt(m.endDate)} &middot; {countsByMission[m.id] || 0} expense(s)
              </span>
            </div>
            <button
              type="button"
              className="expense-del"
              onClick={(e) => { e.stopPropagation(); handleDelete(m.id, m.name) }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
