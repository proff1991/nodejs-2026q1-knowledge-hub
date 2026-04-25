import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['src/**/*.unit.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/unit',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/generated/**',
        'src/**/dto/**',
        'src/**/entities/**',
        'src/**/*.spec.ts',
        'src/**/*.unit.spec.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
    },
  },
});