const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const app = await prisma.bonafideApplication.findFirst({ select: { id: true } });
  console.log(app ? app.id : 'NONE');
  await prisma.$disconnect();
}
main();
