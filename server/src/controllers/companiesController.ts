import { Request, Response } from "express";
import { query } from "../db";
import { insertOneJob } from "./jobsController";
import { insertQueryLog } from "./queryLogsController";
import { fetchGreenhouse } from "../library/boards/greenhouse";
import { fetchAshby } from "../library/boards/ashby";
import { fetchLever } from "../library/boards/lever";
import { Company } from "../model/companies";

export interface Job {
  title: string;
  location: string;
  url: string;
  team?: string;
  employmentType?: string;
  description: string;
  raw: string;
}

export interface BoardResult {
  companyName?: string;
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

interface GetCompaniesResponse {
  data: Company[];
  error?: string;
}

interface SearchCompanyResponse {
  data: CompanyJobInsertResult;
  error?: string;
}

type CompanyJobInsertResult = Partial<Company> & {
  jobsInserted?: number;
  jobCount?: number;
  percentJobsInserted?: number;
};

interface SearchCompanyRequestBody {
  query: string;
}

async function insertOneCompany(
  boardUrl: string,
  name: string,
  slug: string,
  board: string
): Promise<Company> {
  const result = await query(
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
  return result.rows[0] as Company;
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
            name: result.companyName || normalizedCompany,
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

export async function getAllCompanies(
  _req: Request,
  res: Response<GetCompaniesResponse>
) {
  try {
    const result = await query(
      `
      SELECT 
        c.id, 
        c.name, 
        c.board, 
        c.board_url, 
        c.slug, 
        c.created_at, 
        c.updated_at, 
        COUNT(j.id) as job_count
      FROM companies c 
      LEFT JOIN jobs j ON c.id = j.company_id 
      GROUP BY 
        c.id, 
        c.name, 
        c.board, 
        c.board_url, 
        c.slug, 
        c.created_at, 
        c.updated_at
      ORDER BY c.updated_at DESC
      LIMIT 100;
      `
    );
    res.json({ data: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("error getting companies:", err);
    res.status(500).json({ data: [], error: message });
  }
}

export async function addCompanyAndJobs(companyToInsert: CompanyResult) {
  const { boardUrl, name, slug, board, jobs } = companyToInsert;
  let insertedCompany;
  let companyId;
  let jobCount = jobs.length;
  let jobsInserted = 0;

  try {
    if (!boardUrl || !slug || !board) {
      throw new Error("company board data is missing");
    }
    insertedCompany = await insertOneCompany(boardUrl, name, slug, board);
    if (!insertedCompany.id) {
      throw new Error("company id is missing");
    }
    companyId = insertedCompany.id;
  } catch (err) {
    console.error("error inserting company:", err);
    throw err; // stop the rest if company isn't successfully inserted
  }

  for (let job of jobs) {
    const { title, location, url, team, employmentType, description, raw } = job;
    try {
      const jobRes = await insertOneJob({
        title,
        companyId,
        location,
        url,
        team,
        employmentType,
        description,
        raw
      });
      const insertedJob = jobRes.rows[0];
      if (insertedJob.id) {
        jobsInserted++;
      } else {
        throw new Error(
          `${title} for company ${companyId} not inserted into jobs table`
        );
      }
    } catch (err) {
      console.error(`Error inserting job: ${err}`);
    }
  }

  return {
    ...insertedCompany,
    jobsInserted,
    jobCount,
    percentJobsInserted: jobCount === 0 ? 1 : jobsInserted / jobCount,
  };
}

export async function searchCompany(
  req: Request<{}, SearchCompanyResponse, SearchCompanyRequestBody>,
  res: Response<SearchCompanyResponse>
) {
  const { query } = req.body;
  const normalized_query = normalizeString(query);

  const jobBoardResult = await scrapeJobBoards(normalized_query);
  const { found, errors } = jobBoardResult;

  await insertQueryLog({
    raw_query: query,
    normalized_query,
    found,
    errors: errors || [],
  });

  if (!found) {
    return res.json({
      data: {},
      error: `failed to find job board for ${normalized_query}`,
    });
  }

  try {
    const companyData = await addCompanyAndJobs(jobBoardResult);
    res.json({ data: companyData });
  } catch (err) {
    console.error(`failed to add company/jobs for ${normalized_query}: ${err}`);
    return res.status(500).json({
      data: {},
      error: `failed to add company/jobs for ${normalized_query}`,
    });
  }
}
