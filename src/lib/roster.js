import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

// 명단은 행사 중 거의 바뀌지 않고, 하루짜리 행사라 새로고침 전까지 반영이
// 늦어져도 실질적 문제가 없다고 판단해 무기한 캐시한다(TTL·무효화 없음).
let cache = null

export async function loadRoster() {
  if (cache) return cache
  const snap = await getDocs(collection(db, 'roster'))
  cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return cache
}
