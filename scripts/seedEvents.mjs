// 사용법: node scripts/seedEvents.mjs
// 행사 종류 초기 데이터를 events 컬렉션에 넣는다. 필요에 맞게 이 배열을 수정해서 실행하면 됨.

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const events = [
  { id: 'opening', name: '개학식', category: 'opening', date: '2026-09-04' },
  { id: 'scenery', name: '학교 풍경', category: 'scenery', date: '2026-09-04' },
  { id: 'friends', name: '친구', category: 'friends', date: '2026-09-04' },
]

const batch = db.batch()
for (const ev of events) {
  const { id, ...data } = ev
  batch.set(db.collection('events').doc(id), data)
}
await batch.commit()
console.log(`events 컬렉션에 ${events.length}개 업로드 완료`)
