import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    chaiConfig: { truncateThreshold: 0 },
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          include: ['src/**/*.test.ts'],
          name: 'unit'
        }
      },
      {
        extends: true,
        test: {
          globalSetup: ['./test/global-setup.ts'],
          include: ['test/clis/**/*.test.ts'],
          name: 'integration'
        }
      }
    ]
  }
});
