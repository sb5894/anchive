import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadRoster } from '../lib/roster'
import { useIdentity } from '../lib/IdentityContext'

export default function Entry() {
  const navigate = useNavigate()
  const { switchIdentity } = useIdentity()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [enterError, setEnterError] = useState('')
  const [grade, setGrade] = useState('')
  const [klass, setKlass] = useState('')
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    loadRoster()
      .then(setRoster)
      .catch((err) => {
        console.error(err)
        setLoadError('명단을 불러오지 못했습니다. 새로고침해 주세요.')
      })
      .finally(() => setLoading(false))
  }, [])

  const grades = useMemo(
    () => [...new Set(roster.map((r) => r.grade))].sort((a, b) => a - b),
    [roster]
  )
  const classes = useMemo(
    () =>
      [...new Set(roster.filter((r) => r.grade === Number(grade)).map((r) => r.class))].sort(
        (a, b) => a - b
      ),
    [roster, grade]
  )
  const students = useMemo(
    () =>
      roster
        .filter((r) => r.grade === Number(grade) && r.class === Number(klass))
        .sort((a, b) => a.number - b.number),
    [roster, grade, klass]
  )

  async function handleEnter() {
    const student = roster.find((r) => r.id === studentId)
    if (!student) return
    setEntering(true)
    setEnterError('')
    try {
      await switchIdentity({
        grade: student.grade,
        class: student.class,
        number: student.number,
        name: student.name,
      })
      navigate('/feed')
    } catch (err) {
      console.error(err)
      setEnterError('입장하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.')
    } finally {
      setEntering(false)
    }
  }

  if (loading) return <div className="page center">명단을 불러오는 중...</div>
  if (loadError) return <div className="page center error">{loadError}</div>

  return (
    <div className="page entry">
      <h1>우리 학교 아카이브</h1>
      <p className="sub">학년 · 반 · 번호를 선택해서 들어가 주세요.</p>

      <div className="field">
        <label>학년</label>
        <select
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value)
            setKlass('')
            setStudentId('')
          }}
        >
          <option value="">선택</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}학년
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>반</label>
        <select
          value={klass}
          disabled={!grade}
          onChange={(e) => {
            setKlass(e.target.value)
            setStudentId('')
          }}
        >
          <option value="">선택</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}반
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>번호 / 이름</label>
        <select value={studentId} disabled={!klass} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">선택</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}번 {s.name}
            </option>
          ))}
        </select>
      </div>

      {enterError && <p className="error">{enterError}</p>}

      <button className="primary" disabled={!studentId || entering} onClick={handleEnter}>
        {entering ? '입장하는 중...' : '입장하기'}
      </button>
    </div>
  )
}
