const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email: '24eo10va34@mitsgwl.ac.in' },
      data: { department: 'CSE' }
    });
    console.log(`Successfully updated ${user.email} department to ${user.department}`);
  } catch (error) {
    console.error('Error updating user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
