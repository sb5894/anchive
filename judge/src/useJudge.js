import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth } from '../../src/firebase'

const NAME_KEY = 'anchive_judge_name'

// TravelMate와 같은 방식: 계정은 익명 로그인으로만 만들고, "누구인지"는 입력한 이름으로 구분한다.
// 후보 데이터도 uid가 아니라 이름 밑에 저장하므로, PC·폰 어디서든 같은 이름으로 들어오면 이어진다.
export function useJudge() {
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState('')
  const [name, setNameState] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u)
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('익명 로그인 실패', err)
          setAuthError('로그인에 실패했어요. 새로고침해 주세요.')
        })
      }
    })
  }, [])

  function setName(next) {
    try {
      if (next) localStorage.setItem(NAME_KEY, next)
      else localStorage.removeItem(NAME_KEY)
    } catch {
      // 사생활 보호 모드 등에서 저장이 막혀도 이번 접속 동안은 쓸 수 있게 그냥 넘어간다.
    }
    setNameState(next)
  }

  return { user, authError, name, setName }
}

// 이름이 곧 Firestore 문서 id가 되므로 id로 쓸 수 없는 값을 걸러낸다.
export function normalizeJudgeName(raw) {
  const v = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!v) return { error: '이름을 입력해 주세요.' }
  if (v.length > 20) return { error: '이름은 20자 이내로 입력해 주세요.' }
  if (v.includes('/') || v === '.' || v === '..' || /^__.*__$/.test(v)) {
    return { error: '이름에 쓸 수 없는 글자가 있어요.' }
  }
  return { value: v }
}
