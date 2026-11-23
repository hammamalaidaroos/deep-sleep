import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ (and src/assets/images into dist/images/) so
      // both "/src/assets/images/..." and "/images/..." resolve in production builds.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          const srcImages = path.resolve(__dirname, 'src/assets/images');
          const distImages = path.resolve(distDir, 'images');
          if (fs.existsSync(distDir) && fs.existsSync(srcImages)) {
            fs.cpSync(srcImages, distImages, {recursive: true, force: true});
          }

          const robotsPath = path.resolve(distDir, 'robots.txt');
          if (fs.existsSync(distDir) && !fs.existsSync(robotsPath)) {
            fs.writeFileSync(
              robotsPath,
              'User-agent: *\nAllow: /\n\nSitemap: https://deep-sleep-eta.vercel.app/sitemap.xml\n',
              'utf8'
            );
          }

          const sitemapPath = path.resolve(distDir, 'sitemap.xml');
          if (fs.existsSync(distDir) && !fs.existsSync(sitemapPath)) {
            fs.writeFileSync(
              sitemapPath,
              '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://deep-sleep-eta.vercel.app/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n',
              'utf8'
            );
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
