import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  const res = await client.query('SELECT email, role FROM "User"');
  console.log(res.rows);
}

main().catch(console.error).finally(() => client.end());
