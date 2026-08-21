import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { auth } from '../firebase'

const STORAGE_KEY = 'anchive_identity'

const IdentityContext = createContext(null)

export function IdentityProvider({ children }) {
  const [uid, setUid] = useState(null)
  const [identity, setIdentityState] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [authReady, setAuthReady] = useState(false)
  const switchingRef = useRef(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
        setAuthReady(true)
      } else if (!switchingRef.current) {
        signInAnonymously(auth).catch((err) => {
          console.error('익명 로그인 실패', err)
        })
      }
    })
    return unsub
  }, [])

  // 학생을 바꿔 입장할 때마다 새 익명 uid를 발급한다.
  // 같은 브라우저에서 uid를 그대로 쓰면 좋아요/댓글 소유권이 이전 학생과 섞이게 된다.
  async function switchIdentity(rosterEntry) {
    switchingRef.current = true
    try {
      await signOut(auth)
      const cred = await signInAnonymously(auth)
      setUid(cred.user.uid)
    } finally {
      switchingRef.current = false
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rosterEntry))
    setIdentityState(rosterEntry)
  }

  function clearIdentity() {
    localStorage.removeItem(STORAGE_KEY)
    setIdentityState(null)
  }

  return (
    <IdentityContext.Provider value={{ uid, authReady, identity, switchIdentity, clearIdentity }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
