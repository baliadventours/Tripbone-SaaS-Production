import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

function renameHtmlPlugin() {
  return {
    name: 'rename-html-plugin',
    closeBundle() {
      // Resolve paths using import.meta.url or standard __dirname fallback
      const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).pathname);
      const distDir = path.resolve(currentDir, 'dist');
      const htmlPath = path.join(distDir, 'app.html');
      const templatePath = path.join(distDir, 'index.template.html');
      const fallbackPath = path.resolve(currentDir, 'src/indexHtmlFallback.ts');

      try {
        if (fs.existsSync(htmlPath)) {
          const htmlContent = fs.readFileSync(htmlPath, 'utf8');
          
          // 1. Write the fallback file for the server side inline fallback
          const fallbackContent = `export const fallbackHtmlTemplate = ${JSON.stringify(htmlContent)};\n`;
          fs.writeFileSync(fallbackPath, fallbackContent);
          console.log('[Vite Plugin] Successfully updated src/indexHtmlFallback.ts');

          // 2. Write to index.template.html
          fs.writeFileSync(templatePath, htmlContent);
          console.log('[Vite Plugin] Successfully wrote dist/index.template.html');

          // 3. Delete dist/app.html so Vercel/CDNs cannot serve it statically,
          // forcing all page loads to pass through our dynamic express-ssr/SEO engine!
          fs.unlinkSync(htmlPath);
          console.log('[Vite Plugin] Successfully deleted dist/app.html to bypass static cache');
        } else {
          console.log('[Vite Plugin] dist/app.html not found, skipping rename');
        }
      } catch (err) {
        console.error('[Vite Plugin Error]:', err);
      }
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), renameHtmlPlugin()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'app.html')
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
