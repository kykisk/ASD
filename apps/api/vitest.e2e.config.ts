import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,
  test: {
    include: ['src/e2e/**/*.e2e-spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    alias: {
      '@auticare/prisma-client': resolve(__dirname, '../../libs/prisma-client/src/index.ts'),
      '@auticare/encryption': resolve(__dirname, '../../libs/encryption/src/index.ts'),
      '@auticare/dto': resolve(__dirname, '../../libs/shared/dto/src/index.ts'),
      '@auticare/validators': resolve(__dirname, '../../libs/shared/validators/src/index.ts'),
    },
  },
});
