import OpenAI from "openai";
import { argv } from "node:process";
import "dotenv/config";

async function getResults() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const output_file = argv[2];

  const fileResponse = await openai.files.content(output_file);
  const fileContents = await fileResponse.text();

  console.log(fileContents.slice(0, 5000)); // preview of file content
}

getResults();
