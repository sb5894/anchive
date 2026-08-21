import { NavLink } from 'react-router-dom'

const ICONS = {
  timeline: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.3" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.3" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.3" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
}

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주요 화면 이동">
      <NavLink to="/timeline" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        {ICONS.timeline}
        <span>타임라인</span>
      </NavLink>
      <NavLink to="/feed" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        {ICONS.profile}
        <span>피드</span>
      </NavLink>
      <NavLink to="/about" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
        {ICONS.about}
        <span>소개</span>
      </NavLink>
    </nav>
  )
}
