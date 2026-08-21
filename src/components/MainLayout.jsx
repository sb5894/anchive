import BottomNav from './BottomNav'
import Fab from './Fab'

export default function MainLayout({ children }) {
  return (
    <div className="app-shell">
      <div className="app-shell-body">{children}</div>
      <Fab />
      <BottomNav />
    </div>
  )
}
