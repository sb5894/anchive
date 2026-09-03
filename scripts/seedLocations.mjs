// 사용법: node scripts/seedLocations.mjs
// 캠퍼스 지도의 "장소" 목록을 locations 컬렉션에 넣는다.
//
// 이 목록은 src/lib/campusRegions.js의 LOCATION_REGIONS 키와 id가 정확히 같아야 한다.
// CampusMap이 LOCATION_REGIONS[문서 id]로 히트 영역을 찾기 때문에, id가 어긋나면
// 그 건물은 지도에서 눌러도 반응하지 않는다.
//
// 기존 장소들은 원래 Firebase 콘솔에서 손으로 만들어져 있어서 저장소에 기록이 없었다.
// 다시 만들 수 있도록 여기에 전부 적어 둔다. set()이라 여러 번 실행해도 안전하다.
// ('기타'는 Firestore에 두지 않는다 — 어느 구역에도 안 걸린 사진에 화면에서만 붙이는 이름)

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

const locations = [
  { id: 'hugwan', name: '후관' },
  { id: 'bongwan', name: '본관' },
  { id: 'kindergarten', name: '유치원' },
  { id: 'singwan', name: '신관' },
  { id: 'playground', name: '운동장' },
  { id: 'kinder-play', name: '유치원 놀이터' },
  { id: 'garden', name: '두손이텃밭' },
  { id: 'forest', name: '학교숲' },
  { id: 'play-area', name: '놀이터' },
  { id: 'zelkova', name: '느티나무' },
  { id: 'bibonghall', name: '비봉관' },
  { id: 'tennis-court', name: '정구장' },
]

const batch = db.batch()
for (const loc of locations) {
  const { id, ...data } = loc
  batch.set(db.collection('locations').doc(id), data)
}
await batch.commit()
console.log(`locations 컬렉션에 ${locations.length}개 업로드 완료`)
