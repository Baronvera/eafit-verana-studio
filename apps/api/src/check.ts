import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- USERS ---');
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users, null, 2));

  console.log('--- ORGANIZATIONS ---');
  const orgs = await prisma.organization.findMany();
  console.log(JSON.stringify(orgs, null, 2));

  console.log('--- AGENTS ---');
  const agents = await prisma.agent.findMany({
    include: { stack: true, org: true }
  });
  console.log(JSON.stringify(agents, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
