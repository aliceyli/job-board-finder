import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { Job } from "../model/jobs";
import { getJobsToProcess } from "../controllers/jobsController";
import path from "path";
import fs from "fs";
import { pool } from "../db";

export const BATCH_JOB_DIR = path.join(process.cwd(), "src", "jobs", "results");
export const BATCH_JOB_FOLDER_PREFIX = "batch_job_";
export const BATCH_JOB_IDS_FILE_NAME = "_batch_ids";

export const JobMetadataSchema = z.object({
  locationCities: z.array(z.string()).nullable().default(null),
  locationCountries: z.array(z.string()).nullable().default(null),
});

export type JobMetadataParsedResponse = z.infer<typeof JobMetadataSchema>;

function getRequestString(job_id: number, rawData: string) {
  const body = {
    model: "gpt-5-nano",
    input: `Extract the location information from the following text (city and country location should be spelled out and normalized, not abbreviated):\n\n${rawData}`,
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
      const { id, location } = job;
      const jobObject = { location };

      const requestString = getRequestString(id, JSON.stringify(jobObject));
      writer.write(`${requestString}\n`);
    }

    writer.end();
  });
}

async function createBatch(
  batchJobs: Job[],
  batchPath: string,
  openai: OpenAI
) {
  try {
    await createBatchFile(batchJobs, batchPath);

    const file = await openai.files.create({
      file: fs.createReadStream(batchPath),
      purpose: "batch",
    });

    const batch = await openai.batches.create({
      input_file_id: file.id,
      endpoint: "/v1/responses",
      completion_window: "24h",
    });

    return batch.id;
  } catch (err) {
    console.error("Error creating batch", err);
    return;
  }
}

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const jobResults = await getJobsToProcess();
  await pool.end();
  const { data: jobs, error } = jobResults;

  if (jobs.length === 0) {
    throw new Error("No jobs to process");
  }
  if (error) {
    throw new Error(`Error getting jobs from db: ${error}`);
  }

  console.log(`Pulled ${jobs.length} jobs to process`);

  const timestampId = Date.now().toString();
  const dirPath = path.join(
    BATCH_JOB_DIR,
    `${BATCH_JOB_FOLDER_PREFIX}${timestampId}`
  );
  fs.mkdir(dirPath, (err) => {
    if (err) {
      throw new Error(`Error creating directory: ${err}`);
    }
    console.log("Created results directory");
  });

  const batchIdsPath = path.join(dirPath, BATCH_JOB_IDS_FILE_NAME);
  const batchIdsStream = fs.createWriteStream(batchIdsPath, {
    flags: "a",
    encoding: "utf8",
  });
  let fileNum = 1;
  let idx = 0;

  while (idx < jobs.length) {
    const start = idx;
    const end = Math.min(idx + 1000, jobs.length);
    const batchJobs = jobs.slice(start, end);
    const batchPath = path.join(dirPath, `batch_job_requests_${fileNum}.jsonl`);

    const batchId = await createBatch(batchJobs, batchPath, openai);

    if (batchId) {
      batchIdsStream.write(`${batchId}\n`);
      console.log(`Wrote batchID for jobs ${start} to ${end}`);
    } else {
      console.log(`Error: did not receive batchId for jobs ${start} to ${end}`);
    }

    fileNum++;
    idx = end;
  }

  batchIdsStream.end();
  console.log("Finished batching jobs");
}

if (require.main === module) {
  main();
}
