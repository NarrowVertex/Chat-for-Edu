import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 현재 작업 디렉토리의 환경 변수를 로드합니다. (예: .env.production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        // 경로 단축을 위한 절대 경로 에일리어스 설정 (@/components/...)
        '@': resolve(__dirname, './src'),
      },
    },

    // 빌드(배포) 관련 설정
    build: {
      // 프로덕션 환경에서는 콘솔 로그와 디버거를 제거하여 코드를 보호하고 용량을 줄입니다.
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },

      // 청크(Chunk) 분할 최적화: 브라우저 캐싱 효율을 높입니다.
      rollupOptions: {
        output: {
          manualChunks(id) {
            // 대형 라이브러리들은 별도의 파일로 분리하여 빌드합니다.
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('axios') || id.includes('@tanstack')) {
                return 'vendor-network'; // 네트워크/상태관리 라이브러리 분리
              }
              return 'vendor'; // 기타 라이브러리
            }
          },
        },
      },

      // 청크 크기 경고 기준 설정 (SaaS는 기능이 많아 커질 수 있으므로 약간 상향 조정)
      chunkSizeWarningLimit: 1000,
    },

    // 개발 서버 설정
    server: {
      port: 3000,
      strictPort: true, // 3000번 포트가 사용 중이면 서버 실행을 실패하게 만들어 혼선을 방지합니다.
      // SaaS 개발 시 API CORS 문제를 피하기 위한 프록시 설정
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});