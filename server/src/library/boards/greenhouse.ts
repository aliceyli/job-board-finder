import { BoardResult } from "../../controllers/companiesController";

const GREENHOUSE_API = (slug: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
const GREENHOUSE_PUBLIC = (slug: string) =>
  `https://job-boards.greenhouse.io/${slug}`;

export async function fetchGreenhouse(
  slug: string
): Promise<BoardResult | null> {
  const res = await fetch(GREENHOUSE_API(slug));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Greenhouse responded with ${res.status}`);

  const data = await res.json();
  const jobs = (data.jobs || []).map((job: any) => ({
    title: job.title,
    location: job.location?.name || job.location || "Unspecified",
    url: job.absolute_url || GREENHOUSE_PUBLIC(slug),
    description: job.content || "",
  }));

  return { board: "Greenhouse", url: GREENHOUSE_PUBLIC(slug), jobs };
}
