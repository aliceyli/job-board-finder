import OpenAI from "openai";
import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  BATCH_JOB_DIR,
  BATCH_JOB_FOLDER_PREFIX,
  BATCH_JOB_IDS_FILE_NAME,
} from "./jobMetadataBatch";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function checkStatus(batch_id: string) {
  const batch = await openai.batches.retrieve(batch_id);
  const { id, status, output_file_id } = batch;
  return { id, status, output_file_id };
}

async function getResults(output_file: string) {
  const fileResponse = await openai.files.content(output_file);
  const fileContents = await fileResponse.text();

  return fileContents;
}

async function getLatestBatchFolder() {
  const dirs = await fs.promises.readdir(BATCH_JOB_DIR);
  const latestFolderTimestamp = Math.max(
    ...dirs
      .filter((dir) => dir.startsWith(BATCH_JOB_FOLDER_PREFIX))
      .map((dir) => parseInt(dir.substring(BATCH_JOB_FOLDER_PREFIX.length)))
  );
  const latestFolder = `${BATCH_JOB_FOLDER_PREFIX}${latestFolderTimestamp}`;

  return path.join(BATCH_JOB_DIR, latestFolder);
}
async function getBatchIds(batchFolder: string): Promise<string[]> {
  const batchIdsPath = path.join(batchFolder, BATCH_JOB_IDS_FILE_NAME);

  const batchIds: string[] = [];
  try {
    const fileContents = await fs.promises.readFile(batchIdsPath, "utf8");

    for (const line of fileContents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed) {
        batchIds.push(trimmed);
      }
    }
  } catch (err) {
    throw new Error(`Could not read ${batchIdsPath}`);
  }

  return batchIds;
}

async function main() {
  const resultsDir = await getLatestBatchFolder();
  const batchIds = await getBatchIds(resultsDir);

  const resultFile = path.join(resultsDir, "results.jsonl");

  const resultFileStream = fs.createWriteStream(resultFile);

  for (const batchId of batchIds) {
    const { id, status, output_file_id } = await checkStatus(batchId);
    console.log({ id, status, output_file_id });
    if (output_file_id) {
      const results = await getResults(output_file_id);
      resultFileStream.write(results);
    }
  }

  // else if status === "fail"
  // else if status === "pending"
  // return {
  //   successCount,
  //   pendingCount,
  //   failCount,
  // };
}
if (require.main === module) {
  main();
}
