import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, db } from '../firebase'

export function subscribeAdminAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export function adminSignIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function adminSignOut() {
  return signOut(auth)
}

// 최초 관리자 계정 생성용 (1회만 사용, 이후 콘솔에서 계정 관리 권장)
export function adminSignUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function subscribeDeletedPosts(callback) {
  const q = query(collection(db, 'posts'), where('deleted', '==', true), orderBy('deletedAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data(), _type: 'post' })))
  })
}

export function subscribeEditedComments(callback) {
  const q = query(collectionGroup(db, 'comments'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ref: d.ref, ...d.data(), _type: 'comment' }))
      .filter((c) => c.deleted || (c.history && c.history.length > 0))
    callback(items)
  })
}
