"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertQueryLog = insertQueryLog;
const db_1 = require("../db");
async function insertQueryLog({ raw_query, normalized_query, found, errors, }) {
    const addJobQuery = `INSERT INTO query_logs (
            raw_query, 
            normalized_query,
            found,
            errors
        ) 
        values ($1,$2,$3,$4) 
        RETURNING *`;
    return await (0, db_1.query)(addJobQuery, [raw_query, normalized_query, found, errors]);
}
