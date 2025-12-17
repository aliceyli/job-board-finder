import { fetchGreenhouse } from './boards/greenhouse';
import { fetchAshby } from './boards/ashby';
import { fetchLever } from './boards/lever';
import { CompanyResult } from '../types';

interface BoardFetcher {
  name: string;
  fetcher: (slug: string) => Promise<BoardResult | null>;
}

const boards: BoardFetcher[] = [
  { name: 'Greenhouse', fetcher: fetchGreenhouse },
  { name: 'Ashby', fetcher: fetchAshby },
  { name: 'Lever', fetcher: fetchLever },
];

function normalizeString(s: string): string {
  return s
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildSlugCandidates(name: string): string[] {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const hyphenated = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const squashed = lower.replace(/[^a-z0-9]/g, '');

  return Array.from(new Set([trimmed, lower, hyphenated, squashed].filter(Boolean))) as string[];
}

export async function findJobsForCompany(company: string): Promise<CompanyResult> {
  const normalizedCompany = normalizeString(company);
  const slugCandidates = buildSlugCandidates(company);
  const errors: string[] = [];

  for (const slug of slugCandidates) {
    for (const { name, fetcher } of boards) {
      try {
        const result = await fetcher(slug);
        if (result) {
          return {
            company: normalizedCompany,
            slug,
            board: result.board,
            boardUrl: result.url,
            jobs: result.jobs,
          };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${name}/${slug}: ${message}`);
      }
    }
  }

  return { company, errors, board: null, jobs: [] };
}
