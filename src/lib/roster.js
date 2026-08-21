import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

let cache = null

export async function loadRoster() {
  if (cache) return cache
  const snap = await getDocs(collection(db, 'roster'))
  cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return cache
}
