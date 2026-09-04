import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// analytics는 SSR·구형 브라우저·개인정보 보호 확장 프로그램·광고 차단기 등에서
// 초기화가 실패할 수 있다. isSupported()가 true를 줘도 getAnalytics() 자체가
// "Component analytics has not been registered yet" 같은 예외를 던지는
// 경우가 실제로 있어(firebase-js-sdk 쪽 알려진 이슈), try/catch로 한 번 더 감싼다.
// 실패해도 광고 차단기 등 흔한 상황이라 콘솔에 에러만 남기고 넘어간다.
export let analytics = null
isSupported()
  .then((supported) => {
    if (!supported) return
    try {
      analytics = getAnalytics(app)
    } catch (err) {
      console.warn('Firebase Analytics 초기화 실패(무시하고 진행):', err)
    }
  })
  .catch((err) => {
    console.warn('Firebase Analytics 지원 여부 확인 실패(무시하고 진행):', err)
  })
