"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAshby = fetchAshby;
const ASHBY_API = "https://jobs.ashbyhq.com/api/non-user-graphql";
const ASHBY_PUBLIC = (slug) => `https://jobs.ashbyhq.com/${slug}`;
const ASHBY_JOB_BOARD_QUERY = `
  query JobBoardWithTeams($organizationHostedJobsPageName: String!) {
    jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
      teams {
        id
        name
      }
      jobPostings {
        id
        title
        employmentType
        locationName
        teamId
      }
    }
  }
`.trim();
const ASHBY_JOB_POSTING_QUERY = `
  query ApiJobPosting(
    $organizationHostedJobsPageName: String!
    $jobPostingId: String!
  ) {
    jobPosting(
      organizationHostedJobsPageName: $organizationHostedJobsPageName
      jobPostingId: $jobPostingId
    ) {
      descriptionHtml
    }
  }
`.trim();
async function fetchAshby(slug) {
    const res = await fetch(ASHBY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            operationName: "JobBoardWithTeams",
            variables: { organizationHostedJobsPageName: slug },
            query: ASHBY_JOB_BOARD_QUERY,
        }),
    });
    if (!res.ok) {
        // Ashby returns 200 for misses; treat hard errors as non-fatal.
        if (res.status === 404)
            return null;
        throw new Error(`Ashby responded with ${res.status}`);
    }
    const json = await res.json();
    if (json?.errors?.length) {
        const message = json.errors
            .map((e) => e.message)
            .join("; ");
        throw new Error(`Ashby GraphQL error: ${message}`);
    }
    const jobBoard = json?.data?.jobBoard;
    if (!jobBoard || !Array.isArray(jobBoard.teams))
        return null;
    const teamsById = new Map(jobBoard.teams.map((team) => [team.id, team.name]));
    const jobPostings = jobBoard.jobPostings ?? [];
    const jobs = await Promise.all(jobPostings.map(async (job) => {
        const base = {
            title: job.title,
            location: job.locationName || "Unspecified",
            url: `${ASHBY_PUBLIC(slug)}/${job.id}`,
            team: job.teamId ? teamsById.get(job.teamId) : undefined,
            employmentType: job.employmentType,
            description: "",
        };
        const jobPostingRes = await fetch(ASHBY_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                operationName: "ApiJobPosting",
                variables: {
                    organizationHostedJobsPageName: slug,
                    jobPostingId: job.id,
                },
                query: ASHBY_JOB_POSTING_QUERY,
            }),
        });
        if (!jobPostingRes.ok) {
            if (jobPostingRes.status === 404) {
                console.error(`could not find job ${job.id} for ${slug} on ashby`);
            }
            else {
                console.error(`could not connect to ashby api to find job posting details (${jobPostingRes.status})`);
            }
            return base;
        }
        const jobPostingJson = await jobPostingRes.json();
        const descriptionHtml = jobPostingJson?.data?.jobPosting?.descriptionHtml;
        return {
            ...base,
            description: typeof descriptionHtml === "string" ? descriptionHtml : "",
        };
    }));
    return { board: "Ashby", url: ASHBY_PUBLIC(slug), jobs };
}
