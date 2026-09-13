import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../../src/firebase'

// 저장 구조: judges/{심사자 이름}/picks/{postId}
// 문서가 있으면 후보, 없으면 후보 아님. 점수는 두지 않는다.

export function subscribeJudges(callback, onError) {
  return onSnapshot(
    collection(db, 'judges'),
    (snap) => callback(snap.docs.map((d) => d.id)),
    onError
  )
}

export function registerJudge(name) {
  return setDoc(doc(db, 'judges', name), { name, lastSeenAt: serverTimestamp() }, { merge: true })
}

// 합산 탭과 내 후보 탭이 같은 구독 하나를 나눠 쓴다(심사자 몇 명 규모라 전체를 받아도 가볍다).
// 반환: [{ judge, postId, pickedAt(ms) }]
export function subscribeAllPicks(callback, onError) {
  return onSnapshot(
    collectionGroup(db, 'picks'),
    (snap) => {
      callback(
        snap.docs
          // 다른 곳에 picks라는 하위 컬렉션이 생겨도 섞이지 않게 judges 밑의 것만 쓴다.
          .filter((d) => d.ref.parent.parent?.parent?.id === 'judges')
          .map((d) => ({
            judge: d.ref.parent.parent.id,
            postId: d.id,
            // 방금 누른 후보는 서버 시각이 아직 안 채워져 있으니 지금 시각으로 둔다.
            pickedAt: d.data().pickedAt?.toMillis?.() ?? Date.now(),
          }))
      )
    },
    onError
  )
}

export function setPick(judge, postId, picked, uid) {
  const ref = doc(db, 'judges', judge, 'picks', postId)
  return picked ? setDoc(ref, { postId, uid: uid || null, pickedAt: serverTimestamp() }) : deleteDoc(ref)
}
