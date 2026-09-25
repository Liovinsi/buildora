import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5174,
      // In development, /api is proxied to the backend so no CORS setup is needed.
      proxy: {
        '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:5000', changeOrigin: true },
      },
    },
  };
});
