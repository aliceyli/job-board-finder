"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCompanies = getAllCompanies;
exports.addCompanyAndJobs = addCompanyAndJobs;
exports.searchCompany = searchCompany;
const db_1 = require("../db");
const jobsController_1 = require("./jobsController");
const queryLogsController_1 = require("./queryLogsController");
const greenhouse_1 = require("../library/boards/greenhouse");
const ashby_1 = require("../library/boards/ashby");
const lever_1 = require("../library/boards/lever");
async function insertOneCompany(boardUrl, name, slug, board) {
    return await (0, db_1.query)(`INSERT INTO companies (name, slug, board, board_url) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (board_url) DO UPDATE
         SET slug = EXCLUDED.slug,
             board = EXCLUDED.board,
             name = EXCLUDED.name,
             updated_at = NOW()
       RETURNING *`, [name || null, slug || null, board || null, boardUrl || null]);
}
const boards = [
    { name: "Greenhouse", fetcher: greenhouse_1.fetchGreenhouse },
    { name: "Ashby", fetcher: ashby_1.fetchAshby },
    { name: "Lever", fetcher: lever_1.fetchLever },
];
function normalizeString(s) {
    return s
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
function buildSlugCandidates(name) {
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    const hyphenated = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const squashed = lower.replace(/[^a-z0-9]/g, "");
    return Array.from(new Set([trimmed, lower, hyphenated, squashed].filter(Boolean)));
}
async function scrapeJobBoards(company) {
    const normalizedCompany = normalizeString(company);
    const slugCandidates = buildSlugCandidates(company);
    const errors = [];
    for (const slug of slugCandidates) {
        for (const { name, fetcher } of boards) {
            try {
                const result = await fetcher(slug);
                if (result) {
                    return {
                        found: true,
                        name: normalizedCompany,
                        slug,
                        board: result.board,
                        boardUrl: result.url,
                        jobs: result.jobs,
                    };
                }
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                errors.push(`${name}/${slug}: ${message}`);
            }
        }
    }
    errors.push(`${normalizedCompany} not found in job boards (${boards
        .map((board) => board.name)
        .join(", ")})`);
    return {
        found: false,
        name: normalizedCompany,
        errors,
        board: null,
        jobs: [],
    };
}
async function getAllCompanies(_req, res) {
    try {
        const result = await (0, db_1.query)("SELECT * FROM companies;");
        res.json({ data: result.rows });
    }
    catch (err) {
        console.error("error:", err);
    }
}
async function addCompanyAndJobs(companyToInsert) {
    const { boardUrl, name, slug, board, jobs } = companyToInsert;
    let insertedCompany;
    let companyId;
    let jobCount = 0;
    try {
        if (!boardUrl || !slug || !board) {
            throw new Error("company board data is missing");
        }
        const compRes = await insertOneCompany(boardUrl, name, slug, board);
        insertedCompany = compRes.rows[0];
        companyId = insertedCompany.id;
    }
    catch (err) {
        console.error("error inserting company:", err);
    }
    for (let job of jobs) {
        const { title, location, url, team, employmentType, description } = job;
        try {
            const jobRes = await (0, jobsController_1.insertOneJob)({
                title,
                companyId,
                location,
                url,
                team,
                employmentType,
                description,
            });
            const insertedJob = jobRes.rows[0];
            if (insertedJob) {
                jobCount++;
            }
        }
        catch (err) {
            console.error(`Error inserting job: ${err}`);
        }
    }
    return { ...insertedCompany, jobsInserted: jobCount };
}
async function searchCompany(req, res) {
    const { query } = req.body;
    const normalized_query = normalizeString(query);
    // to-do: look into how to wrap this into one transaction that can be rolled back
    const jobBoardResult = await scrapeJobBoards(normalized_query);
    const { found, errors } = jobBoardResult;
    // to-do: add company query to query_logs table
    (0, queryLogsController_1.insertQueryLog)({
        raw_query: query,
        normalized_query,
        found,
        errors: errors || [],
    });
    if (found) {
        const companyData = await addCompanyAndJobs(jobBoardResult);
        res.json({ data: companyData });
    }
    else {
        res.json({ data: {} });
    }
}
