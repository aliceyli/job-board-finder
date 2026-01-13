import { query } from "../db";
import { Request, Response } from "express";
import { JobMetadataParsedResponse } from "../library/processJobMetadata";
import { pool } from "../db";

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

export async function insertOneJobMetadata(
  job_id: number,
  jobMetadata: JobMetadataParsedResponse | null
) {
  if (jobMetadata === null) {
    return;
  }

  const {
    level,
    workPolicy,
    yearsExperienceMin,
    skillsRequired,
    locationCities,
    locationCountries,
  } = jobMetadata;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const filtersQuery = `
        INSERT INTO job_filters(
            job_id,
            level, 
            work_policy, 
            years_experience_min
        ) 
        VALUES($1, $2, $3, $4)
        ON CONFLICT (job_id) DO UPDATE
        SET level = EXCLUDED.level,
            work_policy = EXCLUDED.work_policy,
            years_experience_min = EXCLUDED.years_experience_min
        `;
    if (level || workPolicy || yearsExperienceMin) {
      await client.query(filtersQuery, [
        job_id,
        level,
        workPolicy,
        yearsExperienceMin,
      ]);
    }

    const skills = (skillsRequired || []).filter(Boolean);
    if (skills.length) {
      const skillsQuery = `
          INSERT INTO job_skills(
              job_id,
              skill
          ) 
          SELECT $1, UNNEST($2::text[])
          ON CONFLICT (job_id, skill) DO NOTHING`;
      await client.query(skillsQuery, [job_id, skills]);
    }

    const cities = (locationCities || []).filter(Boolean);
    if (cities.length) {
      const citiesQuery = `
          INSERT INTO job_cities(
              job_id,
              city
          ) 
          SELECT $1, UNNEST($2::text[])
          ON CONFLICT (job_id, city) DO NOTHING`;
      await client.query(citiesQuery, [job_id, cities]);
    }

    const countries = (locationCountries || []).filter(Boolean);
    if (countries.length) {
      const countriesQuery = `
          INSERT INTO job_countries(
              job_id,
              country
          ) 
          SELECT $1, UNNEST($2::text[])
          ON CONFLICT (job_id, country) DO NOTHING`;
      await client.query(countriesQuery, [job_id, countries]);
    }

    const jobsUpdateQuery = `
        UPDATE jobs
        SET last_processed_at = NOW()
        WHERE id = $1`;
    await client.query(jobsUpdateQuery, [job_id]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getJobsToProcess() {
  // temp: test 100 jobs
  try {
    const result = await query(
      `
        SELECT 
            j.* 
        FROM jobs j 
        WHERE 
            raw IS NOT NULL
        LIMIT 100;
        `
    );
    return { data: result.rows };
  } catch (err: unknown) {
    console.error("error querying jobs table:", err);
    return { data: [], error: err };
  }
}

interface JobResult extends Job {
  company_name: string;
}

type PageNum = number;
type ResultsPerPage = number;
type JobsFeedRequest = {
  pageNum?: PageNum;
  resultsPerPage?: ResultsPerPage;
  titleQuery?: string;
  minYears?: string;
};
type JobsFeedResponseData = {
  pageNum: PageNum;
  resultsPerPage: ResultsPerPage;
  resultsCount: number;
  results: JobResult[];
};
type JobsFeedResponse = {
  data: JobsFeedResponseData;
};

export async function getJobsFeed(
  req: Request<JobsFeedRequest>,
  res: Response<JobsFeedResponse>
) {
  const DEFAULT_RESULTS_PER_PAGE = 5;
  const DEFAULT_START_PAGE = 1;

  const { body } = req;
  const { pageNum, resultsPerPage, titleQuery, minYears } = body;
  const limit = Number(resultsPerPage) || DEFAULT_RESULTS_PER_PAGE;
  const page = Number(pageNum) || DEFAULT_START_PAGE;
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [
    `(title ilike '%engineer%' OR title ilike '%SWE%' OR title ilike '%software%' OR title ilike '%developer%')`,
    `(location ilike '%new york%' OR location ilike '%nyc%' OR location ilike '%brooklyn%')`,
    `(title NOT ilike '%intern%' AND title NOT ilike '%university%' AND title NOT ilike '%new grad%' AND title NOT ilike '%lead%' AND title NOT ilike '%senior%' AND title NOT ilike '%sr.%' AND title NOT ilike '%staff%' AND title NOT ilike '%principal%' AND title NOT ilike '%director%' AND title NOT ilike '%vp%' AND title NOT ilike '%vice president%' AND title NOT ilike '%head of%' AND title NOT ilike '%manager%')`,
    `j.description IS NOT NULL`,
  ];

  const params: Array<string | number> = [];

  if (titleQuery) {
    whereClauses.push(`title ilike $${params.length + 1}`);
    params.push(`%${titleQuery}%`);
  }

  if (minYears) {
    whereClauses.push(`j.description ~* $${params.length + 1}`);

    const regex = `\\m${minYears}[\\w.+-]*\\s+years?.{0,60}experience\\y`;
    params.push(regex);
  }

  function getQueryString(select: string) {
    return `SELECT
            ${select}
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE ${whereClauses.join("\n    AND ")}`;
  }

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `${getQueryString(`
            j.*,
            c.name as company_name
        `)}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );
      const { rows: resultRows } = result;

      const totalCountResult = await client.query(getQueryString(`count(*)`), [
        ...params,
      ]);
      const { rows: countRows } = totalCountResult;
      const totalCount = countRows[0].count;

      await client.query("COMMIT");

      res.json({
        data: {
          pageNum,
          resultsPerPage: limit,
          resultsCount: totalCount,
          results: resultRows,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("error:", err);
  }
}
