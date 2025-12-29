import { BoardResult } from "../../controllers/companiesController";
import { sleep } from "../sleep";

const ASHBY_API = "https://jobs.ashbyhq.com/api/non-user-graphql";
const ASHBY_PUBLIC = (slug: string) => `https://jobs.ashbyhq.com/${slug}`;

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

const ASHBY_ORG_QUERY = `
  query ApiOrganizationFromHostedJobsPageName(
    $organizationHostedJobsPageName: String!
    $searchContext: OrganizationSearchContext
  ) {
    organization: organizationFromHostedJobsPageName(
      organizationHostedJobsPageName: $organizationHostedJobsPageName
      searchContext: $searchContext
    ) {
      name
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
      compensationTierSummary
    }
  }
`.trim();

interface AshbyJobPosting {
  id: string;
  title: string;
  employmentType?: string;
  locationName?: string;
  teamId?: string;
}

interface AshbyTeam {
  id: string;
  name: string;
}

async function getAshbyOrgName(slug: string): Promise<string | undefined> {
  try {
    const orgRes = await fetch(ASHBY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "ApiOrganizationFromHostedJobsPageName",
        variables: {
          organizationHostedJobsPageName: slug,
          searchContext: "JobPosting",
        },
        query: ASHBY_ORG_QUERY,
      }),
    });
    if (orgRes.ok) {
      const orgJson = await orgRes.json();
      return orgJson?.data?.organization?.name;
    }
  } catch (err) {
    let errorMessage = `Error fetching Ashby org name for ${slug}: ${err}`;
    console.error(errorMessage);
  }
}

export async function fetchAshby(slug: string): Promise<BoardResult | null> {
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
    if (res.status === 404) return null;
    throw new Error(`Ashby responded with ${res.status}`);
  }

  const json = await res.json();
  if (json?.errors?.length) {
    const message = json.errors
      .map((e: { message: string }) => e.message)
      .join("; ");
    throw new Error(`Ashby GraphQL error: ${message}`);
  }

  const orgName = await getAshbyOrgName(slug);

  const jobBoard = json?.data?.jobBoard;
  if (!jobBoard || !Array.isArray(jobBoard.teams)) return null;

  const teamsById = new Map<string, string>(
    (jobBoard.teams as AshbyTeam[]).map((team) => [team.id, team.name])
  );
  const jobPostings =
    (jobBoard.jobPostings as AshbyJobPosting[] | undefined) ?? [];

  const jobs = [];

  // don't run concurrently with promises.all to avoid rate limiting
  for (let job of jobPostings) {
    console.log(`ashby query for job ${job.id} (${slug}) starting`);
    const base = {
      title: job.title,
      location: job.locationName || "Unspecified",
      url: `${ASHBY_PUBLIC(slug)}/${job.id}`,
      team: job.teamId ? teamsById.get(job.teamId) : undefined,
      employmentType: job.employmentType,
      raw: JSON.stringify(job),
    };

    let jobPostingJson: any | null = null;
    let description = "";
    try {
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
      }

      jobPostingJson = await jobPostingRes.json();
      description = jobPostingJson?.data?.jobPosting?.descriptionHtml || "";
    } catch (err) {
      console.error(
        `ashby job ${job.id} (${slug}) description detail fetch failed: ${err}`
      );
    }

    const raw = jobPostingJson
      ? `${JSON.stringify(job)}${JSON.stringify(jobPostingJson)}`
      : JSON.stringify(job);

    jobs.push({
      ...base,
      description,
      raw,
    });

    await sleep(500); // wait between fetches to avoid rate limiting
  }
  console.log(`ashby api pull for ${slug} done`);

  return {
    companyName: orgName,
    board: "Ashby",
    url: ASHBY_PUBLIC(slug),
    jobs,
  };
}
