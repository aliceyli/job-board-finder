import "dotenv/config";
import { pool } from "./db";
import fs from "fs";
import path from "path";

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, "migrations");

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log("Running migrations:", files);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`\n=== Running ${file} ===`);
      await pool.query(sql);
      console.log(`✅ Finished ${file}`);
    }

    console.log("\nAll migrations complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
