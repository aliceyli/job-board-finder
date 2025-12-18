import { Request, Response } from "express";
import { query } from "../db";
import { insertOneJob } from "./jobsController";
import { insertQueryLog } from "./queryLogsController";
import { fetchGreenhouse } from "../library/boards/greenhouse";
import { fetchAshby } from "../library/boards/ashby";
import { fetchLever } from "../library/boards/lever";

async function insertOneCompany(
  boardUrl: string,
  name: string,
  slug: string,
  board: string
) {
  return await query(
    `INSERT INTO companies (name, slug, board, board_url) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (board_url) DO UPDATE
         SET slug = EXCLUDED.slug,
             board = EXCLUDED.board,
             name = EXCLUDED.name,
             updated_at = NOW()
       RETURNING *`,
    [name || null, slug || null, board || null, boardUrl || null]
  );
}

export interface Job {
  title: string;
  location: string;
  url: string;
  team?: string;
  employmentType?: string;
  description: string;
}

export interface BoardResult {
  board: string;
  url: string;
  jobs: Job[];
}

interface BoardFetcher {
  name: string;
  fetcher: (slug: string) => Promise<BoardResult | null>;
}

interface CompanyResult {
  found: boolean;
  name: string;
  slug?: string;
  board: string | null;
  boardUrl?: string;
  jobs: Job[];
  errors?: string[];
}

const boards: BoardFetcher[] = [
  { name: "Greenhouse", fetcher: fetchGreenhouse },
  { name: "Ashby", fetcher: fetchAshby },
  { name: "Lever", fetcher: fetchLever },
];

function normalizeString(s: string): string {
  return s
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildSlugCandidates(name: string): string[] {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const hyphenated = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const squashed = lower.replace(/[^a-z0-9]/g, "");

  return Array.from(
    new Set([trimmed, lower, hyphenated, squashed].filter(Boolean))
  ) as string[];
}

async function scrapeJobBoards(company: string): Promise<CompanyResult> {
  const normalizedCompany = normalizeString(company);
  const slugCandidates = buildSlugCandidates(company);
  const errors: string[] = [];

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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${name}/${slug}: ${message}`);
      }
    }
  }
  errors.push(
    `${normalizedCompany} not found in job boards (${boards
      .map((board) => board.name)
      .join(", ")})`
  );

  return {
    found: false,
    name: normalizedCompany,
    errors,
    board: null,
    jobs: [],
  };
}

export async function getAllCompanies(_req: Request, res: Response) {
  try {
    const result = await query("SELECT * FROM companies LIMIT 100;");
    res.json({ data: result.rows });
  } catch (err) {
    console.error("error:", err);
  }
}

export async function addCompanyAndJobs(companyToInsert: CompanyResult) {
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
  } catch (err) {
    console.error("error inserting company:", err);
  }

  for (let job of jobs) {
    const { title, location, url, team, employmentType, description } = job;
    try {
      const jobRes = await insertOneJob({
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
    } catch (err) {
      console.error(`Error inserting job: ${err}`);
    }
  }

  return { ...insertedCompany, jobsInserted: jobCount };
}

export async function searchCompany(req: Request, res: Response) {
  const { query } = req.body;
  const normalized_query = normalizeString(query);

  // to-do: look into how to wrap this into one transaction that can be rolled back

  const jobBoardResult = await scrapeJobBoards(normalized_query);
  const { found, errors } = jobBoardResult;

  // to-do: add company query to query_logs table
  insertQueryLog({
    raw_query: query,
    normalized_query,
    found,
    errors: errors || [],
  });

  if (found) {
    const companyData = await addCompanyAndJobs(jobBoardResult);
    res.json({ data: companyData });
  } else {
    res.json({ data: {} });
  }
}
