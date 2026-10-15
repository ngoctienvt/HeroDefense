import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['packages/**/test/**/*.test.ts', 'apps/**/test/**/*.test.ts', 'content/test/**/*.test.ts', 'tests/**/*.test.ts'], testTimeout: 20000 },
});
