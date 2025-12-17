"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runMigrations() {
    try {
        const migrationsDir = path_1.default.join(__dirname, "migrations");
        const files = fs_1.default
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith(".sql"))
            .sort();
        console.log("Running migrations:", files);
        for (const file of files) {
            const filePath = path_1.default.join(migrationsDir, file);
            const sql = fs_1.default.readFileSync(filePath, "utf8");
            console.log(`\n=== Running ${file} ===`);
            await db_1.pool.query(sql);
            console.log(`✅ Finished ${file}`);
        }
        console.log("\nAll migrations complete!");
    }
    catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
    finally {
        await db_1.pool.end();
    }
}
runMigrations();
