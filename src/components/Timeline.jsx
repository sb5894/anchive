import { useEffect, useMemo, useRef } from 'react'

// 행사 category별 아이콘 — 아이콘은 장식일 뿐, 실제 구분은 항상 텍스트 라벨(이름)로 한다.
const CATEGORY_ICON = {
  opening: '🚪',
  scenery: '🌳',
  friends: '🤝',
  sports: '⚽',
  arts: '🎨',
  music: '🎵',
  trip: '🚌',
  ceremony: '🎉',
  study: '📚',
  food: '🍚',
}
const DEFAULT_ICON = '📍'
const UNCATEGORIZED_ICON = '🗂️'
const ALL_ICON = '🏫'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!m) return dateStr
  return `${Number(m[2])}.${Number(m[3])}`
}

export default function Timeline({ events, eventId, onSelect, uncategorizedId, uncategorizedName }) {
  const trailRef = useRef(null)
  const activeRef = useRef(null)

  const sorted = useMemo(
    () => [...events].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [events]
  )

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [eventId])

  const options = [
    { id: '', name: '전체 보기', date: '', icon: ALL_ICON },
    ...sorted.map((e, i) => ({
      id: e.id,
      name: e.name,
      date: formatDate(e.date),
      icon: CATEGORY_ICON[e.category] || DEFAULT_ICON,
      num: i + 1,
    })),
    { id: uncategorizedId, name: uncategorizedName, date: '', icon: UNCATEGORIZED_ICON },
  ]

  return (
    <section className="trail-section" aria-label="학사 일정 이야기 길">
      <div className="trail-wrap" ref={trailRef}>
        <div className="trail" role="list">
          {options.map((opt) => {
            const active = eventId === opt.id
            return (
              <button
                key={opt.id || 'all'}
                type="button"
                role="listitem"
                ref={active ? activeRef : null}
                className={active ? 'stop active' : 'stop'}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(opt.id)}
              >
                <span className="stop-marker">
                  {opt.icon}
                  {opt.num && <span className="stop-num">{opt.num}</span>}
                </span>
                <span className="stop-label">{opt.name}</span>
                {opt.date && <span className="stop-date">{opt.date}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="trail-altnav">
        <label htmlFor="trail-select">목록으로 고르기</label>
        <select id="trail-select" value={eventId} onChange={(e) => onSelect(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.id || 'all'} value={opt.id}>
              {opt.icon} {opt.name}
              {opt.date ? ` · ${opt.date}` : ''}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
