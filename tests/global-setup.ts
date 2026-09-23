import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Fresh throwaway test database for every run.
export default function setup() {
  rmSync("prisma/test.db", { force: true });
  execSync("npx prisma db push", { env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" }, stdio: "ignore" });
}
