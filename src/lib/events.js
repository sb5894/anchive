import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

// 행사 종류를 안 고르고 올리고 싶을 때 쓰는 고정 카테고리(별도 Firestore 문서 아님)
export const UNCATEGORIZED_ID = 'uncategorized'
export const UNCATEGORIZED_NAME = '미분류'

export function subscribeEvents(callback) {
  const q = query(collection(db, 'events'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// 관리자 전용(Firestore 규칙에서 events 쓰기는 isAdmin()만 허용).
// date는 기존 문서들과 동일하게 "YYYY-MM-DD" 문자열로 저장해야 orderBy('date')가
// 뒤섞이지 않는다(Timestamp와 문자열을 섞으면 정렬 순서가 깨짐).
export async function createEvent({ name, date }) {
  await addDoc(collection(db, 'events'), { name, date, category: 'custom' })
}
