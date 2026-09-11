import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    chaiConfig: { truncateThreshold: 0 },
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          exclude: ['src/**/*.prop.test.ts'],
          include: ['src/**/*.test.ts'],
          name: 'unit'
        }
      },
      {
        extends: true,
        test: {
          include: ['test/clis/**/*.test.ts'],
          name: 'integration',
          testTimeout: 60_000
        }
      },
      {
        extends: true,
        test: {
          include: ['src/**/*.prop.test.ts'],
          name: 'properties',
          setupFiles: ['./test/setup/properties.ts'],
          testTimeout: 30_000
        }
      }
    ]
  }
});
