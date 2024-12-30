import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.d.ts',
      ],
      thresholds: {
        branches: 90,
        functions: 66,
        lines: 80,
        statements: 80
      }
    },
  },
});
