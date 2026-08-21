import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
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
