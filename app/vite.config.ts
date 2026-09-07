import { configDefaults, defineConfig } from 'vitest/config';
import type { TestProjectConfiguration } from 'vitest/config';
import react from '@vitejs/plugin-react';

const testExcludes = [
  ...configDefaults.exclude,
  'android/**',
  'tests/e2e/**',
];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    exclude: testExcludes,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.spec.ts'],
          exclude: [
            ...testExcludes,
            'src/**/*.dom.spec.ts',
            'src/shared/testing/**/*.spec.ts',
          ],
          maxWorkers: '50%',
          sequence: {
            groupOrder: 0,
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: [
            'src/**/*.spec.tsx',
            'src/**/*.dom.spec.ts',
          ],
          setupFiles: './src/shared/testing/setup.dom.ts',
          fileParallelism: false,
          sequence: {
            groupOrder: 1,
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'architecture',
          environment: 'node',
          include: ['src/shared/testing/**/*.spec.ts'],
          fileParallelism: false,
          sequence: {
            groupOrder: 2,
          },
        },
      },
    ] as unknown as TestProjectConfiguration[],
  },
});
