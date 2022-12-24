import { rmSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import electronMain from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import react from '@vitejs/plugin-react';

rmSync(path.join(__dirname, 'dist'), { recursive: true, force: true });

// TODO: all the modules below should be removed, and their usage transferred to the main process
const externals = ['electron', 'fs', 'path'];
const otherExternals = ['graceful-fs'];

export default defineConfig({
  appType: 'spa',
  build: {
    sourcemap: true,
    outDir: 'dist/renderer',
  },
  plugins: [
    react(),
    electronMain([
      {
        entry: 'src/main/entrypoint.ts',
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist/main',
          },
        },
      },
      {
        entry: 'src/preload/entrypoint.ts',
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist/preload',
          },
        },
      },
    ]),
    electronRenderer({
      nodeIntegration: true,
      optimizeDeps: {
        include: [...externals, ...otherExternals],
      },
    }),
  ],
});
