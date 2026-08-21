import { Link } from 'react-router-dom'

export default function Fab() {
  return (
    <Link to="/upload" className="fab" aria-label="사진·동영상 올리기">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
      <span className="fab-label">올리기</span>
    </Link>
  )
}
