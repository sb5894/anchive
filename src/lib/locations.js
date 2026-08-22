import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../firebase'

// 이 디자인(캠퍼스 지도) 전용 "장소" 목록. events(행사 종류)와는 별개 컬렉션이라
// 다른 디자인 시안의 카테고리 데이터에 영향을 주지 않는다.
export function subscribeLocations(callback) {
  const q = query(collection(db, 'locations'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}
