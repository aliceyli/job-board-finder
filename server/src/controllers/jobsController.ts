import { query } from "../db";
import { Request, Response } from "express";

export interface Job {
  title: string;
  location: string;
  url: string;
  team?: string;
  employmentType?: string;
  description: string;
  raw: string;
}

export async function insertOneJob({
  title,
  companyId,
  location,
  url,
  team,
  employmentType,
  description,
  raw,
}: {
  title: string;
  companyId: number;
  location: string;
  url: string;
  team: string | undefined;
  employmentType: string | undefined;
  description: string;
  raw: string;
}) {
  const addJobQuery = `INSERT INTO jobs (
        title, 
        company_id, 
        location, 
        url, 
        team, 
        employment_type,
        description, 
        raw
    ) 
    values ($1,$2,$3,$4,$5,$6,$7,$8) 
    ON CONFLICT (url) DO UPDATE
        SET title = EXCLUDED.title,
            company_id = EXCLUDED.company_id,
            location = EXCLUDED.location,
            url = EXCLUDED.url,
            team = EXCLUDED.team,
            employment_type = EXCLUDED.employment_type,
            description = EXCLUDED.description,
            updated_at = NOW(),
            raw = EXCLUDED.raw
    RETURNING *`;

  return await query(addJobQuery, [
    title,
    companyId,
    location,
    url,
    team,
    employmentType,
    description,
    raw,
  ]);
}

// export async function getAllJobs(_req: Request, res: Response) {
//   try {
//     const result = await query(
//       "SELECT j.*, c.name as company_name FROM jobs j JOIN companies c ON c.id = j.company_id;"
//     );
//     res.json({ data: result.rows });
//   } catch (err) {
//     console.error("error:", err);
//   }
// }

interface JobResult extends Job {
  company_name: string;
}

type JobsFeedResponse = { data: JobResult[] };

export async function getJobsFeed(
  _req: Request,
  res: Response<JobsFeedResponse>
) {
  // feed jobs should match preferences and should not be tagged with any label

  // TO-DO: save preferences somewhere and generate the query dynamically
  const TEST_PREFERENCE = {
    title: ["engineer"],
    location: ["new york", "ny"],
  };

  try {
    const result = await query(
      `SELECT j.*, c.name as company_name 
      FROM jobs j 
      JOIN companies c ON c.id = j.company_id 
      WHERE 
        j.title ILIKE '%engineer%' 
        AND (j.location ILIKE '%ny%' OR j.location ILIKE '%new york%')
        LIMIT 100;`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error("error:", err);
  }
}
