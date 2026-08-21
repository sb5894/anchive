// 실제 학교 항공사진을 그대로 쓰지 않고, "건물동 2개가 나란히 배치 + 넓은 운동장"이라는
// 실제 배치 구조에서 영감만 받아 새로 그린 오리지널 평면도 일러스트다.
// 지도는 장식일 뿐 클릭 가능한 요소가 아니고, 실제 상호작용은 위에 얹힌 <button> 핀들이 담당한다.

// 핀이 놓일 자리(퍼센트 좌표, 왼쪽 위 기준). 카테고리 개수만큼 순서대로 배정한다.
const PIN_SLOTS = [
  { left: 15, top: 15 }, // 본관 왼쪽
  { left: 35, top: 18 }, // 본관 오른쪽
  { left: 58, top: 26 }, // 별관 왼쪽
  { left: 80, top: 30 }, // 별관 오른쪽
  { left: 15, top: 58 }, // 운동장 왼쪽
  { left: 38, top: 63 }, // 운동장 가운데왼쪽
  { left: 60, top: 60 }, // 운동장 가운데오른쪽
  { left: 82, top: 66 }, // 운동장 오른쪽
  { left: 35, top: 85 }, // 정문 앞 왼쪽
  { left: 60, top: 85 }, // 정문 앞 오른쪽
]

export default function CampusMap({ categories, activeId, onSelect }) {
  return (
    <div className="campus-map-wrap">
      <svg
        className="campus-map-illustration"
        viewBox="0 0 400 300"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0" y="0" width="400" height="300" fill="var(--map-sky)" />

        {/* 구름 */}
        <g fill="var(--map-cloud)" opacity="0.8">
          <ellipse cx="55" cy="22" rx="18" ry="8" />
          <ellipse cx="72" cy="18" rx="13" ry="7" />
          <ellipse cx="335" cy="16" rx="17" ry="7" />
        </g>

        {/* 본관: 길게 이어진 막대 + 아래로 뻗은 교실동(콤 모양) */}
        <g>
          <rect x="45" y="34" width="150" height="24" rx="4" fill="var(--map-building)" />
          <rect x="45" y="34" width="150" height="8" rx="4" fill="var(--map-roof)" />
          <rect x="55" y="58" width="20" height="34" rx="3" fill="var(--map-building)" />
          <rect x="95" y="58" width="20" height="34" rx="3" fill="var(--map-building)" />
          <rect x="135" y="58" width="20" height="34" rx="3" fill="var(--map-building)" />
          <rect x="170" y="58" width="20" height="34" rx="3" fill="var(--map-building)" />
        </g>

        {/* 깃대 */}
        <line x1="22" y1="40" x2="22" y2="92" stroke="var(--map-pole)" strokeWidth="2" />
        <polygon points="22,40 22,52 36,46" fill="var(--map-flag)" />

        {/* 별관: 본관과 살짝 어긋나게 배치된 두 번째 긴 건물 */}
        <g>
          <rect x="195" y="70" width="170" height="24" rx="4" fill="var(--map-building-2)" />
          <rect x="195" y="70" width="170" height="8" rx="4" fill="var(--map-roof-2)" />
          <rect x="205" y="94" width="18" height="30" rx="3" fill="var(--map-building-2)" />
          <rect x="240" y="94" width="18" height="30" rx="3" fill="var(--map-building-2)" />
          <rect x="275" y="94" width="18" height="30" rx="3" fill="var(--map-building-2)" />
          <rect x="310" y="94" width="18" height="30" rx="3" fill="var(--map-building-2)" />
        </g>

        {/* 운동장 */}
        <rect x="20" y="150" width="330" height="108" rx="12" fill="var(--map-play)" />
        <ellipse
          cx="185"
          cy="204"
          rx="120"
          ry="36"
          fill="none"
          stroke="var(--map-track)"
          strokeWidth="4"
          opacity="0.7"
        />
        <g fill="var(--map-tree)">
          <circle cx="32" cy="164" r="9" />
          <circle cx="366" cy="168" r="8" />
          <circle cx="34" cy="248" r="8" />
        </g>

        {/* 부지 밖 다른 건물(우리 학교 건물 아님) */}
        <g opacity="0.8">
          <rect
            x="328"
            y="228"
            width="56"
            height="38"
            rx="3"
            fill="var(--map-outside)"
            stroke="var(--map-outside-line)"
            strokeDasharray="4 3"
            strokeWidth="2"
          />
          <text x="356" y="278" textAnchor="middle" fontSize="9" fill="var(--map-outside-text)">
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
          opacity="0.6"
        />
        <rect x="150" y="256" width="40" height="14" rx="2" fill="var(--map-gate)" />
        <text x="170" y="266" textAnchor="middle" fontSize="8" fill="#ffffff">
          정문
        </text>
      </svg>

      {categories.map((cat, i) => {
        const slot = PIN_SLOTS[i % PIN_SLOTS.length]
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
