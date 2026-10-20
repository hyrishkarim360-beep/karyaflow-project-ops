import { loadEnvConfig } from "@next/env";
import { hasDatabase, initializeDatabase } from "@/db";

loadEnvConfig(process.cwd());

if (!hasDatabase()) {
  throw new Error("Set DATABASE_URL in .env.local before seeding.");
}

await initializeDatabase();
console.log("Database schema siap dan data demo tersedia jika database kosong.");
