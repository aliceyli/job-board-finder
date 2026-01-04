import { getJobsToProcess } from "../controllers/jobsController";
import processJobMetadata from "../library/processJobMetadata";
import { insertOneJobMetadata } from "../controllers/jobsController";

// this will take forever (days) to run on all jobs currently
// TO-DO: look into openai batch job https://platform.openai.com/docs/guides/batch
export async function processJobs() {
  let processedCount = 0;
  let noMetadataCount = 0;
  let errorCount = 0;
  let jobsWithErrors = [];

  const jobResults = await getJobsToProcess();
  const { data: jobs, error } = jobResults;

  if (jobs.length === 0 || error) {
    return;
  }

  for (const job of jobs.slice(0, 1)) {
    // temp: testing with 1 job right now
    const { id: job_id, raw } = job;
    console.log(`--- processing metadata for job id ${job_id} ---`);

    if (!raw) continue;

    try {
      const jobMetadata = await processJobMetadata(raw);

      if (!jobMetadata) {
        console.log(`no metadata generated`);
        noMetadataCount++;
        continue;
      }

      insertOneJobMetadata(job_id, jobMetadata);
      processedCount++;
      console.log(`✅ processed`);
    } catch (err) {
      console.error(`error with processing job metadata:`, err);
      errorCount++;
      jobsWithErrors.push(job_id);
    }
  }

  const jobResult = {
    totalJobs: jobs.length,
    processedCount,
    noMetadataCount,
    errorCount,
    jobsWithErrors,
  };

  return jobResult;
}

processJobs();
