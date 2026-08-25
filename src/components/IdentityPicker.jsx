import { useEffect, useMemo, useState } from 'react'
import { loadRoster } from '../lib/roster'
import { useIdentity } from '../lib/IdentityContext'

// 사진 올리기·댓글 쓰기처럼 "누가 썼는지"가 필요한 순간에만 띄우는 이름 선택 모달.
// 구경만 할 때는 이 화면을 거치지 않는다.
export default function IdentityPicker({ onDone, onCancel, reason }) {
  const { switchIdentity } = useIdentity()
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [grade, setGrade] = useState('')
  const [klass, setKlass] = useState('')
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    loadRoster()
      .then(setRoster)
      .catch((err) => {
        console.error(err)
        setLoadError('명단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
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

  async function handleConfirm() {
    const student = roster.find((r) => r.id === studentId)
    if (!student) return
    setSaving(true)
    setSaveError('')
    try {
      await switchIdentity({
        grade: student.grade,
        class: student.class,
        number: student.number,
        name: student.name,
      })
      onDone?.()
    } catch (err) {
      console.error(err)
      setSaveError('이름을 저장하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="이름 고르기"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">이름 고르기</h2>
        <p className="modal-sub">{reason || '누가 올렸는지 알 수 있게 이름을 골라 주세요.'}</p>

        {loading && <p className="hint">명단을 불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}

        {!loading && !loadError && (
          <>
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
              <select
                value={studentId}
                disabled={!klass}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">선택</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}번 {s.name}
                  </option>
                ))}
              </select>
            </div>

            {saveError && <p className="error">{saveError}</p>}

            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={onCancel}>
                취소
              </button>
              <button
                type="button"
                className="primary"
                disabled={!studentId || saving}
                onClick={handleConfirm}
              >
                {saving ? '저장하는 중...' : '이 이름으로 하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
