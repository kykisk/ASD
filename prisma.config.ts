import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: 'libs/prisma-client/prisma/schema.prisma',
  migrations: {
    path: 'libs/prisma-client/prisma/migrations',
    seed: 'tsx libs/prisma-client/prisma/seed.ts',
  },
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
});
