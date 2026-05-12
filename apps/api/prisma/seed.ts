import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'dev@verana.io' },
    update: {},
    create: {
      email: 'dev@verana.io',
      passwordHash,
      emailVerified: true,
    },
  });

  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-001' },
    update: {},
    create: {
      id: 'seed-org-001',
      name: 'Verana Dev Org',
      country: 'ES',
      registryId: 'DEV-001',
      userId: user.id,
    },
  });

  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: {
      userId: user.id,
      orgId: org.id,
      role: 'OWNER',
    },
  });

  console.log('Seed completed:', { user: user.email, org: org.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
