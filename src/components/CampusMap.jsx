// 실제 학교 배치도(후관/본관+유치원/신관/비봉관 건물 + 운동장/놀이터/두손이텃밭/학교숲 공간)를
// 참고해서 새로 그린 오리지널 평면도 일러스트. 실사 도면을 그대로 쓰지 않고 비율만 반영했다.
// categories 핀은 장소를 고르는 접근 경로이고, onMapClick이 주어지면 지도를 직접 탭해서
// "정확히 여기서 찍었어요"라고 좌표를 콕 찍는 보조 입력도 지원한다(둘 다 선택 사항).

const LOCATION_POSITIONS = {
  hugwan: { left: 54, top: 6 },
  bongwan: { left: 43, top: 21 },
  kindergarten: { left: 88, top: 21 },
  singwan: { left: 16, top: 43 },
  bibonghall: { left: 81, top: 85 },
  playground: { left: 51, top: 50 },
  garden: { left: 16, top: 61 },
  forest: { left: 16, top: 71 },
  'play-area': { left: 44, top: 74 },
}
const FALLBACK_SLOTS = [
  { left: 60, top: 30 },
  { left: 70, top: 55 },
  { left: 30, top: 85 },
]

export default function CampusMap({ categories, activeId, onSelect, spot, onMapClick }) {
  let fallbackIndex = 0

  function handleWrapClick(e) {
    if (!onMapClick) return
    if (e.target.closest('.map-pin')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onMapClick({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }

  return (
    <div
      className={onMapClick ? 'campus-map-wrap pickable' : 'campus-map-wrap'}
      onClick={handleWrapClick}
    >
      <svg
        className="campus-map-illustration"
        viewBox="0 0 400 600"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <linearGradient id="mapSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-sky-top)" />
            <stop offset="100%" stopColor="var(--map-sky)" />
          </linearGradient>
          <linearGradient id="mapHugwan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-hugwan-light)" />
            <stop offset="100%" stopColor="var(--map-hugwan)" />
          </linearGradient>
          <linearGradient id="mapBongwan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-bongwan-light)" />
            <stop offset="100%" stopColor="var(--map-bongwan)" />
          </linearGradient>
          <linearGradient id="mapSingwan" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--map-singwan-light)" />
            <stop offset="100%" stopColor="var(--map-singwan)" />
          </linearGradient>
          <linearGradient id="mapBibong" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-bibong-light)" />
            <stop offset="100%" stopColor="var(--map-bibong)" />
          </linearGradient>
          <radialGradient id="mapTree" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="var(--map-tree-light)" />
            <stop offset="100%" stopColor="var(--map-tree)" />
          </radialGradient>
          <filter id="mapShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1a2a3a" floodOpacity="0.18" />
          </filter>
          <filter id="mapSoftBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <rect x="0" y="0" width="400" height="600" fill="url(#mapSky)" />

        {/* 건물이 하늘에 붕 떠 보이지 않도록 건물 구역 아래 옅은 바닥면을 깐다 */}
        <ellipse cx="180" cy="150" rx="220" ry="130" fill="var(--map-ground)" opacity="0.5" />

        {/* 해 / 구름 */}
        <circle cx="355" cy="45" r="18" fill="var(--map-sun)" opacity="0.5" filter="url(#mapSoftBlur)" />
        <circle cx="355" cy="45" r="11" fill="var(--map-sun)" opacity="0.85" />
        <g fill="var(--map-cloud)" opacity="0.9">
          <ellipse cx="45" cy="40" rx="20" ry="8" />
          <ellipse cx="62" cy="35" rx="14" ry="7" />
        </g>

        {/* 후관 그림자 + 건물 */}
        <ellipse cx="215" cy="60" rx="90" ry="6" fill="var(--map-ground-shadow)" opacity="0.32" filter="url(#mapSoftBlur)" />
        <g filter="url(#mapShadow)">
          <rect x="90" y="15" width="250" height="42" rx="6" fill="url(#mapHugwan)" />
          <rect x="90" y="15" width="250" height="9" rx="4" fill="var(--map-hugwan-roof)" />
        </g>
        <g fill="var(--map-window)" opacity="0.85">
          {[105, 135, 165, 195, 225, 255, 285, 315].map((x) => (
            <rect key={x} x={x} y="32" width="10" height="16" rx="2" />
          ))}
        </g>

        {/* 연결통로 */}
        <rect x="202" y="57" width="26" height="48" fill="var(--map-corridor)" opacity="0.9" />
        <line x1="215" y1="57" x2="215" y2="105" stroke="var(--map-corridor-line)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

        {/* 본관 + 유치원 그림자 */}
        <ellipse cx="215" cy="150" rx="150" ry="7" fill="var(--map-ground-shadow)" opacity="0.35" filter="url(#mapSoftBlur)" />

        {/* 본관 */}
        <g filter="url(#mapShadow)">
          <rect x="35" y="105" width="270" height="42" rx="6" fill="url(#mapBongwan)" />
          <rect x="35" y="105" width="270" height="9" rx="4" fill="var(--map-bongwan-roof)" />
        </g>
        <g fill="var(--map-window)" opacity="0.85">
          {[50, 80, 110, 140, 170, 200, 230, 260, 285].map((x) => (
            <rect key={x} x={x} y="122" width="10" height="16" rx="2" />
          ))}
        </g>

        {/* 유치원(본관과 같은 줄, 오른쪽 끝에 붙은 작은 구획) */}
        <g filter="url(#mapShadow)">
          <rect x="308" y="105" width="92" height="42" rx="6" fill="var(--map-kinder)" />
          <rect x="308" y="105" width="92" height="9" rx="4" fill="var(--map-kinder-roof)" />
        </g>
        <circle cx="330" cy="132" r="6" fill="var(--map-kinder-deco)" />
        <circle cx="352" cy="132" r="6" fill="var(--map-kinder-deco)" opacity="0.8" />
        <circle cx="374" cy="132" r="6" fill="var(--map-kinder-deco)" opacity="0.6" />

        {/* 신관 그림자 + 건물(세로형) */}
        <ellipse cx="62" cy="332" rx="8" ry="72" fill="var(--map-ground-shadow)" opacity="0.3" filter="url(#mapSoftBlur)" />
        <g filter="url(#mapShadow)">
          <rect x="35" y="190" width="55" height="140" rx="6" fill="url(#mapSingwan)" />
          <rect x="35" y="190" width="55" height="9" rx="4" fill="var(--map-singwan-roof)" />
        </g>
        <g fill="var(--map-window)" opacity="0.85">
          {[210, 235, 260, 285, 305].map((y) => (
            <rect key={y} x="48" y={y} width="28" height="12" rx="2" />
          ))}
        </g>

        {/* 운동장 */}
        <rect x="105" y="195" width="195" height="210" rx="16" fill="var(--map-play)" />
        <ellipse cx="202" cy="300" rx="80" ry="80" fill="none" stroke="var(--map-track)" strokeWidth="5" opacity="0.6" />
        <ellipse cx="202" cy="300" rx="55" ry="55" fill="none" stroke="var(--map-track)" strokeWidth="2" opacity="0.4" />

        {/* 두손이텃밭 */}
        <g filter="url(#mapShadow)">
          <rect x="35" y="345" width="55" height="45" rx="6" fill="var(--map-garden)" />
        </g>
        <g fill="var(--map-garden-deco)">
          <circle cx="48" cy="365" r="4" />
          <circle cx="62" cy="358" r="4" />
          <circle cx="76" cy="368" r="4" />
          <circle cx="55" cy="378" r="4" />
        </g>

        {/* 학교숲 */}
        <g filter="url(#mapShadow)">
          <rect x="35" y="405" width="55" height="45" rx="6" fill="var(--map-forest-bg)" />
        </g>
        <g>
          {[[48, 425, 8], [66, 418, 7], [76, 432, 6]].map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} fill="url(#mapTree)" />
          ))}
        </g>

        {/* 놀이터 */}
        <g filter="url(#mapShadow)">
          <rect x="120" y="420" width="110" height="45" rx="6" fill="var(--map-play-area)" />
        </g>
        <g stroke="var(--map-play-area-deco)" strokeWidth="3" fill="none" opacity="0.7">
          <path d="M138 452 v-18 M138 434 h20 v18" />
          <circle cx="185" cy="443" r="9" />
          <path d="M210 452 l10 -18 l10 18 z" />
        </g>

        {/* 비봉관(강당) */}
        <ellipse cx="325" cy="558" rx="48" ry="6" fill="var(--map-ground-shadow)" opacity="0.3" filter="url(#mapSoftBlur)" />
        <g filter="url(#mapShadow)">
          <rect x="280" y="460" width="90" height="95" rx="6" fill="url(#mapBibong)" />
          <path d="M276 460 l45 -22 l45 22 z" fill="var(--map-bibong-roof)" />
        </g>
        <rect x="310" y="510" width="30" height="45" rx="3" fill="var(--map-window)" opacity="0.9" />

        {/* 트리 데코 (운동장 가장자리) */}
        <g>
          {[[112, 205, 9], [292, 210, 8], [290, 395, 8]].map(([cx, cy, r]) => (
            <g key={`${cx}-${cy}`}>
              <rect x={cx - 1.5} y={cy + r - 2} width="3" height="9" fill="var(--map-tree-trunk)" />
              <circle cx={cx} cy={cy} r={r} fill="url(#mapTree)" />
            </g>
          ))}
        </g>
      </svg>

      {categories.map((cat) => {
        const slot = LOCATION_POSITIONS[cat.id] || FALLBACK_SLOTS[fallbackIndex++ % FALLBACK_SLOTS.length]
        const isActive = activeId === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            className={isActive ? 'map-pin active' : 'map-pin'}
            style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(cat.id)
            }}
            aria-pressed={isActive}
          >
            <span className="map-pin-dot" aria-hidden="true" />
            <span className="map-pin-label">{cat.name}</span>
          </button>
        )
      })}

      {spot && (
        <span className="map-spot-marker" style={{ left: `${spot.x}%`, top: `${spot.y}%` }} aria-hidden="true" />
      )}
    </div>
  )
}
