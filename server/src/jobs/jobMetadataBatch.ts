import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Job } from "../model/jobs";
import { getJobsToProcess } from "../controllers/jobsController";
import path from "path";
import fs from "fs";
import { pool } from "../db";

export const JobMetadataSchema = z.object({
  level: z
    .enum([
      "Executive",
      "Director",
      "Manager",
      "Principal",
      "Staff",
      "Senior",
      "Mid Level",
      "Entry Level",
      "Internship",
    ])
    .nullable()
    .default(null),
  workPolicy: z.enum(["Remote", "Hybrid", "On-site"]).nullable().default(null),
  yearsExperienceMin: z.number().nullable().default(null),
  skillsRequired: z.array(z.string()).nullable().default(null),
  locationCities: z.array(z.string()).nullable().default(null),
  locationCountries: z.array(z.string()).nullable().default(null),
});

export type JobMetadataParsedResponse = z.infer<typeof JobMetadataSchema>;

function getRequestString(job_id: number, rawData: string) {
  const body = {
    model: "gpt-5-nano",
    input: `Extract the job post information from the following text (skills should not be more than a word or 2 and focus on programming languages and skills like react, aws, etc.; city and country location should be spelled out, not abbreviated):\n\n${rawData}`,
    text: {
      format: zodTextFormat(JobMetadataSchema, "jobMetadata"),
    },
  };

  return `{"custom_id": "${job_id}", "method": "POST", "url": "/v1/responses", "body": ${JSON.stringify(
    body
  )}}`;
}

function createBatchFile(jobs: Job[], batchPath: string) {
  return new Promise<void>((resolve, reject) => {
    const writer = fs
      .createWriteStream(batchPath)
      .on("error", (err) => {
        console.error("Error writing to batch job file:", err);
        reject();
      })
      .on("finish", () => {
        console.log("finished writing to job batch file");
        resolve();
      });

    for (const job of jobs) {
      const { id, title, location, team, description } = job;
      const jobObject = { title, location, team, description };

      const requestString = getRequestString(id, JSON.stringify(jobObject));
      console.log(`writing request for job ${id}`);
      writer.write(`${requestString}\n`);
    }

    writer.end();
  });
}

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const jobResults = await getJobsToProcess();
  await pool.end();
  const { data: jobs, error } = jobResults;

  if (jobs.length === 0 || error) {
    return;
  }

  const timestampId = Date.now().toString();

  const batchPath = path.join(
    process.cwd(),
    "src",
    "jobs",
    "results",
    `batch_job_requests_${timestampId}.jsonl`
  );

  await createBatchFile(jobs.slice(0, 100), batchPath);

  // upload file to openai
  const file = await openai.files.create({
    file: fs.createReadStream(batchPath),
    purpose: "batch",
  });
  console.log({ file });

  // create batch
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/responses",
    completion_window: "24h",
  });

  console.log({ batch });
}

main();
