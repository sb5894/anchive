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

// 저장 구조: judges/{심사자 이름}/picks/{postId}__{mediaKey}
// 문서가 있으면 그 사진이 후보, 없으면 후보 아님. 점수는 두지 않는다.
// 사진은 게시물 안 순서(index)가 아니라 mediaKey로 가리킨다 — 학생이 게시물을 고쳐
// 앞 사진을 빼면 순서가 밀려 엉뚱한 사진이 후보가 되기 때문.
// (초기 버전은 문서 id가 postId뿐이고 mediaKey가 없었다. 읽는 쪽에서 첫 사진으로 취급한다.)

// Storage 파일 이름(업로드 때 붙인 UUID)을 사진의 고정 id로 쓴다.
// 영상은 변환되면 url이 {uuid}_h264.mp4로 바뀌므로 그 꼬리를 떼서 원본과 같은 값이 나오게 한다.
export function mediaKeyOf(media) {
  const url = media?.url || ''
  try {
    const objectPath = decodeURIComponent(new URL(url).pathname.split('/o/')[1] || '')
    const base = objectPath.split('/').pop().replace(/\.[^.]+$/, '').replace(/_h264$/, '')
    if (base) return base
  } catch {
    // 형식이 다른 주소면 아래에서 url 자체를 쓴다.
  }
  return url
}

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
// 반환: [{ docId, judge, postId, mediaKey(없으면 null), pickedAt(ms) }]
export function subscribeAllPicks(callback, onError) {
  return onSnapshot(
    collectionGroup(db, 'picks'),
    (snap) => {
      callback(
        snap.docs
          // 다른 곳에 picks라는 하위 컬렉션이 생겨도 섞이지 않게 judges 밑의 것만 쓴다.
          .filter((d) => d.ref.parent.parent?.parent?.id === 'judges')
          .map((d) => {
            const data = d.data()
            return {
              docId: d.id,
              judge: d.ref.parent.parent.id,
              postId: data.postId || d.id,
              mediaKey: data.mediaKey || null,
              // 방금 누른 후보는 서버 시각이 아직 안 채워져 있으니 지금 시각으로 둔다.
              pickedAt: data.pickedAt?.toMillis?.() ?? Date.now(),
            }
          })
      )
    },
    onError
  )
}

export function pickDocId(postId, mediaKey) {
  return `${postId}__${mediaKey}`
}

export function setPick(judge, postId, mediaKey, picked, uid) {
  const ref = doc(db, 'judges', judge, 'picks', pickDocId(postId, mediaKey))
  return picked
    ? setDoc(ref, { postId, mediaKey, uid: uid || null, pickedAt: serverTimestamp() })
    : deleteDoc(ref)
}

// 예전 형식(문서 id = postId) 후보를 지울 때 쓴다.
export function deletePickDoc(judge, docId) {
  return deleteDoc(doc(db, 'judges', judge, 'picks', docId))
}
