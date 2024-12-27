import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        'coverage/**',
        'vitest.config.ts'
      ],
      all: true,
      thresholds: {
        branches: 90,
        functions: 75,
        lines: 84,
        statements: 84
      }
    },
  },
});
