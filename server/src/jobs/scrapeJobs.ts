import { argv } from "node:process";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { searchCompany } from "../library/scrapeJobs";

// given a csv with list of company_names (with 1st line being label),
// looks for company name in job board apis and inserts them into db if found
// outputs 2 csvs (error_companies.csv and missing_companies.csv)
//
// run job in CLI -
// `ts-node ./src/jobs/scrapeJobs.ts [startIdx]`
// startIdx: company index to start at; default is 0
async function processCompanyList() {
  const startIdx = Number(argv.slice(2)) || 0;

  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "test_companies.csv"
  );

  const csvHasHeader = true; // make sure csv file has header or first will be skipped
  const idxOffSet = csvHasHeader ? 2 : 1;

  const parser = fs.createReadStream(filePath, { encoding: "utf8" }).pipe(
    parse({
      from_line: startIdx + idxOffSet,
    }).on("error", (error) =>
      console.error(`error reading company csv: ${error.message}`)
    )
  );

  let curIdx = startIdx;
  let totalCount = 0;
  let foundCount = 0;
  let errorCount = 0;

  const errorCompaniesPath = path.join(
    process.cwd(),
    "src",
    "jobs",
    "results",
    "error_companies.csv"
  );
  const errorCompaniesStream = fs.createWriteStream(errorCompaniesPath, {
    flags: "a",
    encoding: "utf8",
  });

  const missingCompaniesPath = path.join(
    process.cwd(),
    "src",
    "jobs",
    "results",
    "missing_companies.csv"
  );
  const missingCompaniesStream = fs.createWriteStream(missingCompaniesPath, {
    flags: "a",
    encoding: "utf8",
  });

  console.log(`begin processing csv ${filePath}`);

  for await (const [company_string] of parser) {
    console.log(`\nbegin processing idx ${curIdx}`);
    const result = await searchCompany(company_string);
    totalCount++;
    const { found, jobCount, jobsInserted, error } = result;
    const missingJobInserts = (jobsInserted || 0) < (jobCount || 0);

    const escapedCompany = `"${company_string.replace(/"/g, '""')}"`;
    if (found) {
      foundCount++;
    } else {
      missingCompaniesStream.write(`${escapedCompany}\n`);
    }

    if (error || missingJobInserts) {
      errorCount++;
      errorCompaniesStream.write(`${escapedCompany}\n`);
    }
    console.log(`finished processing idx ${curIdx}`);
    curIdx++;
  }

  console.log(`finished processing company list`);
  console.log(`${totalCount} companies processed`);
  console.log(`${foundCount} companies found`);
  console.log(`${errorCount} found companies with errors`);

  errorCompaniesStream.end();
  missingCompaniesStream.end();
}

processCompanyList();
