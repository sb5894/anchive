import { Link, useLocation } from 'react-router-dom'

const ISSUE_LABEL = '제124회 개교기념일 특별호 · 1902년 개교'

export default function Masthead({ identity }) {
  const { pathname } = useLocation()

  return (
    <div className="masthead">
      <div className="masthead-row">
        <img className="masthead-logo" src="/안성초_로고_한글(png).png" alt="안성초등학교 로고" />
        <span className="masthead-title">안성초 아카이브</span>
        <nav className="masthead-nav">
          <Link to="/feed" className={pathname === '/feed' ? 'active' : ''}>
            <span className="ico" aria-hidden="true">
              🏠
            </span>
            <span>지면 보기</span>
          </Link>
          <Link to="/upload" className={pathname === '/upload' ? 'active' : ''}>
            <span className="ico" aria-hidden="true">
              ✎
            </span>
            <span>기사 올리기</span>
          </Link>
        </nav>
      </div>
      <div className="masthead-sub">
        <span>{ISSUE_LABEL}</span>
        {identity && (
          <span>
            {identity.grade}-{identity.class} {identity.name} 님
          </span>
        )}
      </div>
    </div>
  )
}
