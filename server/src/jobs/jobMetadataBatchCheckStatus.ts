import OpenAI from "openai";
import "dotenv/config";
import { argv } from "node:process";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function checkStatus() {
  const batch_id = argv[2] || "batch_695c3b33717c81909b5e3b8d03fa0f69"; // batch with 100
  // "batch_695c3104924c8190be05ae0a2ecf8beb"; // initial batch with 3

  const batch = await openai.batches.retrieve(batch_id);
  console.log(batch);
}

async function listBatches() {
  const list = await openai.batches.list();

  for await (const batch of list) {
    console.log(batch);
  }
}

checkStatus();

// listBatches();

// latest - batch_695c3b33717c81909b5e3b8d03fa0f69
