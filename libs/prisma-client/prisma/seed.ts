import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('Admin123!@#', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@auticare.com' },
    update: {},
    create: {
      email: 'admin@auticare.com',
      name: '시스템 관리자',
      passwordHash: adminPassword,
      role: UserRole.SYSTEM_ADMIN,
    },
  });

  console.log('Seeded admin user:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
