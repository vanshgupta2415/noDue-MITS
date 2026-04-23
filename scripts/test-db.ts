import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$connect()
    console.log('Connected to DB!')
    
    const userCount = await prisma.user.count()
    console.log('User count:', userCount)
  } catch (e) {
    console.error('DB Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
