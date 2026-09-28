import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // HTTPS dev server (self-signed cert): Meta's FB.login / Embedded Signup refuses http pages.
    plugins: [react(), tailwindcss(), basicSsl()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5174,
      // In development, /api is proxied to the backend so no CORS setup is needed.
      proxy: {
        '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:5000', changeOrigin: true },
      },
    },
  };
});
