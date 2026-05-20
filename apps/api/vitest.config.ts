import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    alias: {
      '@auticare/prisma-client': resolve(__dirname, '../../libs/prisma-client/src/index.ts'),
      '@auticare/encryption': resolve(__dirname, '../../libs/encryption/src/index.ts'),
      '@auticare/dto': resolve(__dirname, '../../libs/shared/dto/src/index.ts'),
      '@auticare/validators': resolve(__dirname, '../../libs/shared/validators/src/index.ts'),
    },
  },
});
