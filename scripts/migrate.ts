/** Ensure SQLite schema exists (also auto-created on first use). `npm run db:migrate`. */
import { getDb } from "@/lib/jobs/store";

getDb();
console.log("jobs table ready");
