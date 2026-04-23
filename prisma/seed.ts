import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
console.log("🔗 Connecting to:", connectionString.replace(/:[^:@]+@/, ":***@"));

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Test@1234";
const SUPER_ADMIN_PASSWORD = "Admin@mits2024";

async function createUser(opts: {
  email: string;
  password: string;
  name: string;
  role: string;
  department?: string;
  enrollmentNo?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 12);

  const data: Prisma.UserCreateInput = {
    email: opts.email,
    passwordHash,
    name: opts.name,
    role: opts.role,
    ...(opts.department && { department: opts.department }),
    ...(opts.enrollmentNo && { enrollmentNo: opts.enrollmentNo }),
  };

  await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      passwordHash,
      name: opts.name,
      role: opts.role,
      ...(opts.department !== undefined && { department: opts.department }),
      ...(opts.enrollmentNo !== undefined && { enrollmentNo: opts.enrollmentNo }),
    },
    create: {
      email: opts.email,
      passwordHash,
      name: opts.name,
      role: opts.role,
      ...(opts.department && { department: opts.department }),
      ...(opts.enrollmentNo && { enrollmentNo: opts.enrollmentNo }),
    },
  });
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean up existing data in correct order to respect foreign keys
  try {
    await prisma.approval.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("🧹 Cleared existing data");
  } catch (e) {
    console.log("⚠️ Could not clear data", e);
  }

  await createUser({ email: "superadmin@mitsgwl.ac.in", password: SUPER_ADMIN_PASSWORD, name: "System Admin", role: "SUPER_ADMIN" });
  console.log(`✅ Super Admin: superadmin@mitsgwl.ac.in (password: ${SUPER_ADMIN_PASSWORD})`);

  await createUser({ email: "student@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Love Mishra", role: "STUDENT", enrollmentNo: "0108CS221001", department: "CSE" });
  console.log(`✅ Student: student@mitsgwl.ac.in`);

  await createUser({ email: "faculty@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Dr. Rajesh Kumar", role: "FACULTY", department: "CSE" });
  console.log(`✅ Faculty: faculty@mitsgwl.ac.in`);

  await createUser({ email: "coordinator@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Prof. Neha Gupta", role: "CLASS_COORDINATOR", department: "CSE" });
  console.log(`✅ Class Coordinator: coordinator@mitsgwl.ac.in`);

  await createUser({ email: "hod@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Dr. Amit Sharma", role: "HOD", department: "CSE" });
  console.log(`✅ HOD: hod@mitsgwl.ac.in`);

  await createUser({ email: "warden@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Mr. Suresh Patel", role: "HOSTEL_WARDEN" });
  console.log(`✅ Hostel Warden: warden@mitsgwl.ac.in`);

  await createUser({ email: "library@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Mrs. Sunita Verma", role: "LIBRARY_ADMIN" });
  console.log(`✅ Library Admin: library@mitsgwl.ac.in`);

  await createUser({ email: "workshop@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Mr. Ramesh Yadav", role: "WORKSHOP_ADMIN" });
  console.log(`✅ Workshop Admin: workshop@mitsgwl.ac.in`);

  await createUser({ email: "tnp@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Dr. Priya Singh", role: "TP_OFFICER" });
  console.log(`✅ T&P Officer: tnp@mitsgwl.ac.in`);

  await createUser({ email: "office@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Mr. Vikram Joshi", role: "GENERAL_OFFICE" });
  console.log(`✅ General Office: office@mitsgwl.ac.in`);

  await createUser({ email: "accounts@mitsgwl.ac.in", password: DEFAULT_PASSWORD, name: "Mrs. Kavita Dubey", role: "ACCOUNTS_OFFICER" });
  console.log(`✅ Accounts Officer: accounts@mitsgwl.ac.in`);

  console.log(`\n🎉 Seeding complete!`);
  console.log(`📝 Default users password: ${DEFAULT_PASSWORD}`);
  console.log(`📝 Super Admin password: ${SUPER_ADMIN_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
