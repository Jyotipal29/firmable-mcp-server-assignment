import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://mcp:mcp@localhost:5432/account_intelligence";
const maxAttempts = 30;
const delayMs = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 2 });
  try {
    await sql`select 1`;
    await sql.end();
    console.log(`Postgres is ready (attempt ${attempt}/${maxAttempts}).`);
    process.exit(0);
  } catch {
    await sql.end({ timeout: 1 });
    console.log(`Waiting for Postgres... (attempt ${attempt}/${maxAttempts})`);
    await sleep(delayMs);
  }
}

console.error("Postgres did not become ready in time.");
process.exit(1);
