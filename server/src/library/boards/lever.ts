import { BoardResult } from "../scrapeJobs";

const LEVER_API = (slug: string) =>
  `https://api.lever.co/v0/postings/${slug}?include=content`;
const LEVER_PUBLIC = (slug: string) => `https://jobs.lever.co/${slug}`;

export async function fetchLever(slug: string): Promise<BoardResult | null> {
  const res = await fetch(LEVER_API(slug));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lever responded with ${res.status}`);

  const jobs = await res.json();
  if (!Array.isArray(jobs)) return null;

  const normalized = jobs.map((job: any) => ({
    title: job.text,
    location: job.categories?.location || "Unspecified",
    url: job.hostedUrl || job.applyUrl || job.urls?.apply || LEVER_PUBLIC(slug),
    team: job.categories?.department || "",
    employmentType: job.categories?.commitment || "",
    description: job.description || "",
    raw: JSON.stringify(job),
  }));

  return {
    board: "Lever",
    url: LEVER_PUBLIC(slug),
    jobs: normalized,
  };
}
