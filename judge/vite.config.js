import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 심사 전용 사이트. anchive 본 사이트와 배포를 완전히 분리하려고 폴더·설정을 따로 두지만,
// Firebase 설정(.env)과 게시물·장소·작성자 표기 코드는 상위 src/에서 그대로 가져다 쓴다.
// 패키지도 루트 node_modules를 같이 쓴다(여기엔 따로 설치하지 않음).
export default defineConfig({
  envDir: '..',
  plugins: [react()],
  server: {
    port: 5188,
    strictPort: true,
    fs: { allow: ['..'] },
  },
})
