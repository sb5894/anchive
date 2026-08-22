// 실제 학교 항공사진을 그대로 쓰지 않고, "건물동 2개가 나란히 배치 + 넓은 운동장"이라는
// 실제 배치 구조에서 영감만 받아 새로 그린 오리지널 평면도 일러스트다.
// 지도는 장식일 뿐 클릭 가능한 요소가 아니고, 실제 상호작용은 위에 얹힌 <button> 핀들이 담당한다.

// 장소 id별로 지도 위 고정 위치(퍼센트 좌표, 왼쪽 위 기준)를 의미 있게 배정한다.
// 알 수 없는 장소가 추가되면 운동장 빈 자리 쪽에 순서대로 배치한다.
const LOCATION_POSITIONS = {
  'main-building': { left: 26, top: 21 },
  library: { left: 52, top: 15 },
  annex: { left: 75, top: 36 },
  cafeteria: { left: 91, top: 48 },
  playground: { left: 50, top: 70 },
  gate: { left: 42, top: 90 },
}
const FALLBACK_SLOTS = [
  { left: 15, top: 70 },
  { left: 30, top: 76 },
  { left: 65, top: 76 },
  { left: 80, top: 70 },
]

export default function CampusMap({ categories, activeId, onSelect }) {
  let fallbackIndex = 0
  return (
    <div className="campus-map-wrap">
      <svg
        className="campus-map-illustration"
        viewBox="0 0 400 300"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="mapSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-sky-top)" />
            <stop offset="100%" stopColor="var(--map-sky)" />
          </linearGradient>
          <linearGradient id="mapMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-building-light)" />
            <stop offset="100%" stopColor="var(--map-building)" />
          </linearGradient>
          <linearGradient id="mapAnnex" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-building-2-light)" />
            <stop offset="100%" stopColor="var(--map-building-2)" />
          </linearGradient>
          <linearGradient id="mapPlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--map-play-light)" />
            <stop offset="100%" stopColor="var(--map-play)" />
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

        <rect x="0" y="0" width="400" height="300" fill="url(#mapSky)" />

        {/* 해 */}
        <circle cx="362" cy="30" r="16" fill="var(--map-sun)" opacity="0.55" filter="url(#mapSoftBlur)" />
        <circle cx="362" cy="30" r="10" fill="var(--map-sun)" opacity="0.85" />

        {/* 구름 */}
        <g fill="var(--map-cloud)" opacity="0.9">
          <ellipse cx="55" cy="24" rx="20" ry="8" />
          <ellipse cx="74" cy="19" rx="14" ry="7" />
          <ellipse cx="40" cy="19" rx="12" ry="6" />
        </g>

        {/* 본관: 길게 이어진 막대 + 아래로 뻗은 교실동(콤 모양), 창문 디테일 포함 */}
        <g filter="url(#mapShadow)">
          <rect x="45" y="34" width="150" height="24" rx="5" fill="url(#mapMain)" />
          <rect x="45" y="34" width="150" height="7" rx="3" fill="var(--map-roof)" />
          {[55, 95, 135, 170].map((x) => (
            <rect key={x} x={x} y="58" width="20" height="34" rx="4" fill="url(#mapMain)" />
          ))}
        </g>
        {/* 본관 창문 */}
        <g fill="var(--map-window)" opacity="0.85">
          {[58, 78, 98, 118, 138, 158, 178].map((x) => (
            <rect key={x} x={x} y="42" width="8" height="8" rx="1.5" />
          ))}
          {[55, 95, 135, 170].map((x) => (
            <g key={x}>
              <rect x={x + 4} y="65" width="12" height="9" rx="1.5" />
              <rect x={x + 4} y="80" width="12" height="9" rx="1.5" />
            </g>
          ))}
        </g>

        {/* 깃대 */}
        <line x1="22" y1="40" x2="22" y2="92" stroke="var(--map-pole)" strokeWidth="2" />
        <polygon points="22,40 22,52 36,46" fill="var(--map-flag)" />

        {/* 도서관: 둥근 지붕의 작은 별채 */}
        <g filter="url(#mapShadow)">
          <rect x="188" y="26" width="34" height="26" rx="4" fill="var(--map-library)" />
          <path d="M186 26 Q205 6 224 26 Z" fill="var(--map-library-roof)" />
          <rect x="200" y="38" width="10" height="14" rx="2" fill="var(--map-window)" opacity="0.9" />
        </g>

        {/* 별관: 본관과 살짝 어긋나게 배치된 두 번째 긴 건물 */}
        <g filter="url(#mapShadow)">
          <rect x="195" y="70" width="170" height="24" rx="5" fill="url(#mapAnnex)" />
          <rect x="195" y="70" width="170" height="7" rx="3" fill="var(--map-roof-2)" />
          {[205, 240, 275, 310].map((x) => (
            <rect key={x} x={x} y="94" width="18" height="30" rx="4" fill="url(#mapAnnex)" />
          ))}
        </g>
        <g fill="var(--map-window)" opacity="0.85">
          {[199, 219, 239, 259, 279, 299, 319, 339].map((x) => (
            <rect key={x} x={x} y="77" width="7" height="7" rx="1.5" />
          ))}
        </g>

        {/* 급식실: 물결 지붕의 작은 별채 */}
        <g filter="url(#mapShadow)">
          <rect x="345" y="112" width="40" height="26" rx="4" fill="var(--map-cafeteria)" />
          <path
            d="M343 112 q5 -8 10 0 q5 -8 10 0 q5 -8 10 0 q5 -8 10 0 v6 h-40 z"
            fill="var(--map-cafeteria-roof)"
          />
          <rect x="358" y="124" width="14" height="10" rx="2" fill="var(--map-window)" opacity="0.9" />
        </g>

        {/* 운동장 */}
        <rect x="20" y="150" width="330" height="108" rx="14" fill="url(#mapPlay)" />
        <ellipse
          cx="185"
          cy="204"
          rx="120"
          ry="36"
          fill="none"
          stroke="var(--map-track)"
          strokeWidth="5"
          opacity="0.55"
        />
        <ellipse
          cx="185"
          cy="204"
          rx="95"
          ry="26"
          fill="none"
          stroke="var(--map-track)"
          strokeWidth="2"
          opacity="0.35"
        />
        <g>
          {[
            [32, 164, 9],
            [366, 168, 8],
            [34, 248, 8],
            [340, 244, 7],
          ].map(([cx, cy, r]) => (
            <g key={`${cx}-${cy}`}>
              <rect x={cx - 1.5} y={cy + r - 2} width="3" height="9" fill="var(--map-tree-trunk)" />
              <circle cx={cx} cy={cy} r={r} fill="url(#mapTree)" />
            </g>
          ))}
        </g>

        {/* 부지 밖 다른 건물(우리 학교 건물 아님) */}
        <g opacity="0.7">
          <rect
            x="328"
            y="228"
            width="56"
            height="30"
            rx="3"
            fill="var(--map-outside)"
            stroke="var(--map-outside-line)"
            strokeDasharray="4 3"
            strokeWidth="2"
          />
          <text x="356" y="270" textAnchor="middle" fontSize="8" fill="var(--map-outside-text)">
            다른 건물(교육지원청)
          </text>
        </g>

        {/* 정문 앞 도로 */}
        <rect x="0" y="268" width="400" height="32" fill="var(--map-road)" />
        <line
          x1="0"
          y1="284"
          x2="400"
          y2="284"
          stroke="#ffffff"
          strokeWidth="2"
          strokeDasharray="10 8"
          opacity="0.5"
        />
        <g filter="url(#mapShadow)">
          <rect x="145" y="252" width="10" height="16" rx="2" fill="var(--map-gate)" />
          <rect x="185" y="252" width="10" height="16" rx="2" fill="var(--map-gate)" />
          <rect x="145" y="248" width="50" height="8" rx="2" fill="var(--map-gate)" />
        </g>
        <text x="170" y="246" textAnchor="middle" fontSize="9" fill="var(--map-gate-text)">
          정문
        </text>
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
            onClick={() => onSelect(cat.id)}
            aria-pressed={isActive}
          >
            <span className="map-pin-dot" aria-hidden="true" />
            <span className="map-pin-label">{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}
