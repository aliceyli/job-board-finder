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
  try {
    const result = await query(
      `
        SELECT 
            j.* 
        FROM jobs j 
        WHERE 
            raw IS NOT NULL;
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

type JobsFeedResponse = { data: JobResult[] };

export async function getJobsFeed(
  _req: Request,
  res: Response<JobsFeedResponse>
) {
  try {
    const result = await query(
      `SELECT
    j.*,
    c.name as company_name
FROM jobs j
JOIN companies c ON c.id = j.company_id
WHERE
    (
        title ilike '%engineer%'
        OR title like '%SWE%'
        OR title ilike '%software%'
        OR title ilike '%developer%'
    ) AND (
        location ilike '%new york%'
        OR location ilike '%nyc%'
        OR location ilike '%brooklyn%'
    ) AND (
        title NOT ilike '%intern%'
        AND title NOT ilike '%university%'
        AND title NOT ilike '%new grad%'
        AND title NOT ilike '%lead%'
        AND title NOT ilike '%senior%'
        AND title NOT ilike '%sr.%'
        AND title NOT ilike '%staff%'
        AND title NOT ilike '%principal%'
        AND title NOT ilike '%director%'
        AND title NOT ilike '%vp%'
        AND title NOT ilike '%vice president%'
        AND title NOT ilike '%head of%'
        AND title NOT ilike '%manager%'
    )`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error("error:", err);
  }
}
