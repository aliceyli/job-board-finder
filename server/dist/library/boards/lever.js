"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLever = fetchLever;
const LEVER_API = (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`;
const LEVER_PUBLIC = (slug) => `https://jobs.lever.co/${slug}`;
async function fetchLever(slug) {
    const res = await fetch(LEVER_API(slug));
    if (res.status === 404)
        return null;
    if (!res.ok)
        throw new Error(`Lever responded with ${res.status}`);
    const jobs = await res.json();
    if (!Array.isArray(jobs))
        return null;
    const normalized = jobs.map((job) => ({
        title: job.text,
        location: job.categories?.location || "Unspecified",
        url: job.hostedUrl || job.applyUrl || job.urls?.apply || LEVER_PUBLIC(slug),
        team: job.categories?.department || "",
        employmentType: job.categories?.commitment || "",
        description: job.content?.descriptionHtml || ""
    }));
    return { board: "Lever", url: LEVER_PUBLIC(slug), jobs: normalized };
}
