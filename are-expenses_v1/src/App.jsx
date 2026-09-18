import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Missions from './components/Missions.jsx'
import ExpenseForm from './components/ExpenseForm.jsx'
import ExpenseList from './components/ExpenseList.jsx'
import ReportView from './components/ReportView.jsx'
import { getAllExpenses, getAllMissions } from './db.js'

const LAST_MISSION_KEY = 'are-current-mission-id'

export default function App() {
  const [tab, setTab] = useState('missions')
  const [expenses, setExpenses] = useState([])
  const [missions, setMissions] = useState([])
  const [currentMissionId, setCurrentMissionId] = useState(
    () => localStorage.getItem(LAST_MISSION_KEY) || null
  )

  const reloadExpenses = useCallback(async () => {
    setExpenses(await getAllExpenses())
  }, [])

  const reloadMissions = useCallback(async () => {
    setMissions(await getAllMissions())
  }, [])

  useEffect(() => { reloadExpenses(); reloadMissions() }, [reloadExpenses, reloadMissions])

  // If the saved mission no longer exists (deleted), clear the selection
  useEffect(() => {
    if (currentMissionId && missions.length && !missions.some(m => m.id === currentMissionId)) {
      setCurrentMissionId(null)
    }
  }, [missions, currentMissionId])

  function selectMission(id) {
    setCurrentMissionId(id)
    localStorage.setItem(LAST_MISSION_KEY, id)
    setTab('list')
  }

  const currentMission = missions.find(m => m.id === currentMissionId) || null

  function goTab(t) {
    if (t !== 'missions' && !currentMission) {
      setTab('missions')
      return
    }
    setTab(t)
  }

  return (
    <>
      <Header />
      <nav className="tabs">
        <button className={tab === 'missions' ? 'active' : ''} onClick={() => goTab('missions')}>Missions</button>
        <button className={tab === 'new' ? 'active' : ''} onClick={() => goTab('new')}>+ Expense</button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => goTab('list')}>List</button>
        <button className={tab === 'report' ? 'active' : ''} onClick={() => goTab('report')}>Report</button>
      </nav>

      {currentMission && tab !== 'missions' && (
        <div className="current-mission-bar">
          Mission: <strong>{currentMission.name}</strong>
          <button onClick={() => goTab('missions')}>Switch</button>
        </div>
      )}

      <main>
        {tab === 'missions' && (
          <Missions
            missions={missions}
            expenses={expenses}
            currentMissionId={currentMissionId}
            onSelect={selectMission}
            onChanged={reloadMissions}
          />
        )}
        {tab === 'new' && currentMission && (
          <ExpenseForm
            missionId={currentMission.id}
            onSaved={() => { reloadExpenses(); setTab('list') }}
          />
        )}
        {tab === 'list' && currentMission && (
          <ExpenseList mission={currentMission} expenses={expenses} onChanged={reloadExpenses} />
        )}
        {tab === 'report' && currentMission && (
          <ReportView mission={currentMission} expenses={expenses} />
        )}
      </main>
    </>
  )
}
