const DB_NAME = 'spese-are-db'
const DB_VERSION = 2
const EXPENSES_STORE = 'expenses'
const MISSIONS_STORE = 'missions'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      let expensesStore
      if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
        expensesStore = db.createObjectStore(EXPENSES_STORE, { keyPath: 'id' })
        expensesStore.createIndex('date', 'date', { unique: false })
      } else {
        expensesStore = req.transaction.objectStore(EXPENSES_STORE)
      }
      if (!expensesStore.indexNames.contains('missionId')) {
        expensesStore.createIndex('missionId', 'missionId', { unique: false })
      }
      if (!db.objectStoreNames.contains(MISSIONS_STORE)) {
        db.createObjectStore(MISSIONS_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ---- Expenses ----

export async function getAllExpenses() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXPENSES_STORE, 'readonly')
    const req = tx.objectStore(EXPENSES_STORE).getAll()
    req.onsuccess = () => {
      const rows = req.result.sort((a, b) => (a.date < b.date ? 1 : -1))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveExpense(expense) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXPENSES_STORE, 'readwrite')
    tx.objectStore(EXPENSES_STORE).put(expense)
    tx.oncomplete = () => resolve(expense)
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteExpense(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXPENSES_STORE, 'readwrite')
    tx.objectStore(EXPENSES_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ---- Missions ----

export async function getAllMissions() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MISSIONS_STORE, 'readonly')
    const req = tx.objectStore(MISSIONS_STORE).getAll()
    req.onsuccess = () => {
      const rows = req.result.sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveMission(mission) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MISSIONS_STORE, 'readwrite')
    tx.objectStore(MISSIONS_STORE).put(mission)
    tx.oncomplete = () => resolve(mission)
    tx.onerror = () => reject(tx.error)
  })
}

// Deletes a mission AND every expense linked to it
export async function deleteMission(id) {
  const db = await openDB()
  const linked = await new Promise((resolve, reject) => {
    const tx = db.transaction(EXPENSES_STORE, 'readonly')
    const idx = tx.objectStore(EXPENSES_STORE).index('missionId')
    const req = idx.getAll(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  await new Promise((resolve, reject) => {
    const tx = db.transaction(EXPENSES_STORE, 'readwrite')
    const store = tx.objectStore(EXPENSES_STORE)
    for (const e of linked) store.delete(e.id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  await new Promise((resolve, reject) => {
    const tx = db.transaction(MISSIONS_STORE, 'readwrite')
    tx.objectStore(MISSIONS_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
