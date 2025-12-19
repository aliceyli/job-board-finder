"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGreenhouse = fetchGreenhouse;
const GREENHOUSE_API = (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
const GREENHOUSE_PUBLIC = (slug) => `https://job-boards.greenhouse.io/${slug}`;
async function fetchGreenhouse(slug) {
    const res = await fetch(GREENHOUSE_API(slug));
    if (res.status === 404)
        return null;
    if (!res.ok)
        throw new Error(`Greenhouse responded with ${res.status}`);
    const data = await res.json();
    let companyName = slug;
    if (data.jobs.length > 0) {
        companyName = data.jobs[0].company_name;
    }
    const jobs = (data.jobs || []).map((job) => ({
        title: job.title,
        location: job.location?.name || job.location || "Unspecified",
        url: job.absolute_url || GREENHOUSE_PUBLIC(slug),
        description: job.content || "",
    }));
    return {
        companyName,
        board: "Greenhouse",
        url: GREENHOUSE_PUBLIC(slug),
        jobs,
    };
}
