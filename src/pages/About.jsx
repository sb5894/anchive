import { Link } from 'react-router-dom'
import { useIdentity } from '../lib/IdentityContext'

export default function About() {
  const { identity, clearIdentity } = useIdentity()

  return (
    <div className="page about-page">
      <header className="about-hero">
        <img className="about-logo" src="/icon-192.png" alt="안성초등학교 아이콘" />
        <h1>이 아카이브는요</h1>
        <p className="sub">1902년에 문을 연 안성초등학교, 그 오랜 이야기에 우리 학년이 새로 남기는 기록장이에요.</p>
      </header>

      <section className="about-section">
        <h2>무엇을 할 수 있나요?</h2>
        <ul className="about-list">
          <li>
            <span className="about-list-icon" aria-hidden="true">📷</span>
            <div>
              <strong>사진·동영상 올리기</strong>
              <p>행사 때 찍은 사진이나 짧은 동영상(50MB까지)을 자유롭게 올릴 수 있어요.</p>
            </div>
          </li>
          <li>
            <span className="about-list-icon" aria-hidden="true">🗂️</span>
            <div>
              <strong>행사별로 모아보기</strong>
              <p>개교기념일, 운동회 같은 행사 이름으로 사진을 나눠서 볼 수 있어요.</p>
            </div>
          </li>
          <li>
            <span className="about-list-icon" aria-hidden="true">❤️</span>
            <div>
              <strong>좋아요와 댓글</strong>
              <p>친구나 선생님이 올린 사진에 좋아요를 누르고, 댓글로 응원의 말을 남길 수 있어요.</p>
            </div>
          </li>
          <li>
            <span className="about-list-icon" aria-hidden="true">🕒</span>
            <div>
              <strong>타임라인 / 피드 두 가지 보기</strong>
              <p>왼쪽 탭에서는 시간 순서대로, 가운데 탭에서는 사진만 모아 그리드로 볼 수 있어요.</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>이렇게 이용해요</h2>
        <ol className="about-steps">
          <li>맨 처음 화면에서 학년 · 반 · 번호를 골라 들어와요. (비밀번호가 따로 없어요)</li>
          <li>가운데 <strong>피드</strong> 탭에서 우리 학교 사진을 그리드로 둘러봐요.</li>
          <li>어디서든 화면 아래 <strong>+ 올리기</strong> 버튼을 누르면 새 사진을 올릴 수 있어요.</li>
          <li>사진을 눌러 자세히 보고, 좋아요와 댓글을 남겨요.</li>
        </ol>
      </section>

      {identity && (
        <section className="about-section about-identity">
          <h2>지금 입장 정보</h2>
          <p>
            <strong>{identity.grade}학년 {identity.class}반 {identity.number}번 {identity.name}</strong> 님으로
            들어와 있어요.
          </p>
          <div className="about-actions">
            <Link to="/" className="link-btn" onClick={clearIdentity}>
              다른 학번으로 다시 들어가기
            </Link>
          </div>
        </section>
      )}

      <section className="about-section about-footer">
        <p className="sub">선생님이신가요?</p>
        <Link to="/admin" className="link-btn">관리자 화면으로 이동</Link>
      </section>
    </div>
  )
}
