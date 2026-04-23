import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });
const DEFAULT_PASSWORD = 'Test@1234';

const students = [
  { email: 'student2@mitsgwl.ac.in', name: 'Aarav Sharma',    enrollmentNo: '0108CS221002', department: 'CSE' },
  { email: 'student3@mitsgwl.ac.in', name: 'Priya Verma',     enrollmentNo: '0108CS221003', department: 'CSE' },
  { email: 'student4@mitsgwl.ac.in', name: 'Rohan Gupta',     enrollmentNo: '0108CS221004', department: 'CSE' },
  { email: 'student5@mitsgwl.ac.in', name: 'Anjali Singh',    enrollmentNo: '0108CS221005', department: 'CSE' },
  { email: 'student6@mitsgwl.ac.in', name: 'Vikram Patel',    enrollmentNo: '0108EC221006', department: 'EC'  },
  { email: 'student7@mitsgwl.ac.in', name: 'Neha Yadav',      enrollmentNo: '0108EC221007', department: 'EC'  },
  { email: 'student8@mitsgwl.ac.in', name: 'Harsh Dubey',     enrollmentNo: '0108ME221008', department: 'ME'  },
  { email: 'student9@mitsgwl.ac.in', name: 'Riya Joshi',      enrollmentNo: '0108ME221009', department: 'ME'  },
  { email: 'student10@mitsgwl.ac.in', name: 'Aditya Kumar',   enrollmentNo: '0108CE221010', department: 'CE'  },
];

async function main() {
  console.log('🌱 Adding student accounts...\n');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  for (const s of students) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, role: 'STUDENT', department: s.department, enrollmentNo: s.enrollmentNo },
      create: { email: s.email, passwordHash, name: s.name, role: 'STUDENT', department: s.department, enrollmentNo: s.enrollmentNo },
    });
    console.log(`✅ ${s.name} — ${s.email}  (${s.department}, ${s.enrollmentNo})`);
  }

  console.log(`\n🎉 Done! Password for all: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
