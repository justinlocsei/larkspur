import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    chaiConfig: { truncateThreshold: 0 },
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
