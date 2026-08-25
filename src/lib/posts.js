import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase'
import { resizeImage } from './image'
import { locationIdForSpot } from './campusRegions'

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // storage.rules와 동일한 값으로 유지

function extensionOf(filename) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename)
  return match ? match[1].toLowerCase() : 'mp4'
}

// 이 디자인은 장소를 따로 고르지 않는다. 지도에 찍은 좌표(spot) 하나만 저장하고,
// "어느 건물인지"는 화면에 뿌릴 때 campusRegions의 locationIdForSpot()으로 계산한다.
// 그래야 나중에 영역 박스를 손봐도 기존 사진이 자동으로 다시 분류된다.
export async function createPost({ eventId, spot, authorUid, authorInfo, files, caption }) {
  const postRef = doc(collection(db, 'posts'))

  const media = []
  for (const file of files) {
    const isVideo = file.type.startsWith('video/')

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      throw new Error(`동영상 "${file.name}"이 50MB를 넘어요. 더 짧은 영상으로 올려주세요.`)
    }

    const uploadFile = isVideo ? file : await resizeImage(file)
    const ext = isVideo ? extensionOf(file.name) : 'jpg'
    // eventId는 이 디자인에서 고정값이라 분류와 무관하고, Storage 경로를 만드는 용도로만 쓴다.
    const path = `events/${eventId}/posts/${postRef.id}/${crypto.randomUUID()}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, uploadFile)
    media.push({ url: await getDownloadURL(storageRef), type: isVideo ? 'video' : 'image' })
  }

  await setDoc(postRef, {
    eventId,
    // 지도에 찍은 촬영 위치. {x,y}는 지도 이미지 기준 퍼센트 좌표이고, 이 값이 분류의 유일한 근거다.
    spot: spot || null,
    authorUid,
    authorInfo,
    media,
    caption: caption || '',
    createdAt: serverTimestamp(),
    likeCount: 0,
    deleted: false,
    history: [],
  })

  return postRef.id
}

export function subscribeFeed({ eventId }, callback) {
  const base = collection(db, 'posts')
  const q = eventId
    ? query(base, where('eventId', '==', eventId), orderBy('createdAt', 'desc'))
    : query(base, orderBy('createdAt', 'desc'))

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => !p.deleted)
    )
  })
}

// 장소 기준 필터. 저장된 값이 아니라 좌표에서 계산한 장소로 거른다.
// where절 없이 정렬만 걸어서 새 복합 색인이 필요 없다(게시물 수가 적은 소규모 서비스라 무리 없음).
export function subscribeFeedByLocation(locationId, callback) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.deleted)
    callback(locationId ? all.filter((p) => locationIdForSpot(p.spot) === locationId) : all)
  })
}

export function subscribePost(postId, callback) {
  return onSnapshot(doc(db, 'posts', postId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

// 좋아요 문서 쓰기와 likeCount 증감을 하나의 트랜잭션으로 묶어서, 둘 중 하나만
// 성공하는 상황(권한 오류·네트워크 끊김 등)에서 카운터가 실제 좋아요 수와 어긋나는 걸 막는다.
export async function toggleLike(postId, uid) {
  const likeRef = doc(db, 'posts', postId, 'likes', uid)
  const postRef = doc(db, 'posts', postId)

  await runTransaction(db, async (tx) => {
    const existing = await tx.get(likeRef)
    if (existing.exists()) {
      tx.delete(likeRef)
      tx.update(postRef, { likeCount: increment(-1) })
    } else {
      tx.set(likeRef, { createdAt: serverTimestamp() })
      tx.update(postRef, { likeCount: increment(1) })
    }
  })
}

export async function editPost({ postId, newCaption, previousCaption }) {
  const ref = doc(db, 'posts', postId)
  const snap = await getDoc(ref)
  const history = snap.exists() ? snap.data().history || [] : []
  await updateDoc(ref, {
    caption: newCaption,
    editedAt: serverTimestamp(),
    history: [...history, { caption: previousCaption, editedAtMs: Date.now(), action: 'edit' }],
  })
}

export async function softDeletePost(postId, previousCaption) {
  const ref = doc(db, 'posts', postId)
  const snap = await getDoc(ref)
  const history = snap.exists() ? snap.data().history || [] : []
  await updateDoc(ref, {
    deleted: true,
    deletedAt: serverTimestamp(),
    history: [...history, { caption: previousCaption, editedAtMs: Date.now(), action: 'delete' }],
  })
}

export function subscribeComments(postId, callback) {
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function addComment({ postId, authorUid, authorInfo, text }) {
  await addDoc(collection(db, 'posts', postId, 'comments'), {
    authorUid,
    authorInfo,
    text,
    createdAt: serverTimestamp(),
    editedAt: null,
    history: [],
    deleted: false,
  })
}

// Firestore는 배열 원소 안에 serverTimestamp()를 허용하지 않아 history 항목은 클라이언트 시각(ms)을 사용한다.
export async function editComment({ postId, commentId, newText, previousText }) {
  const ref = doc(db, 'posts', postId, 'comments', commentId)
  const snap = await getDoc(ref)
  const history = snap.exists() ? snap.data().history || [] : []
  await updateDoc(ref, {
    text: newText,
    editedAt: serverTimestamp(),
    history: [...history, { text: previousText, editedAtMs: Date.now() }],
  })
}

export async function softDeleteComment({ postId, commentId, previousText }) {
  const ref = doc(db, 'posts', postId, 'comments', commentId)
  const snap = await getDoc(ref)
  const history = snap.exists() ? snap.data().history || [] : []
  await updateDoc(ref, {
    deleted: true,
    deletedAt: serverTimestamp(),
    history: [...history, { text: previousText, editedAtMs: Date.now() }],
  })
}
