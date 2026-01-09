import { AddCompanyAndJobRequest, SearchCompanyRequest } from './api-types';
import { Job } from '../types';

export async function getConnections(): Promise<any[]> {
  try {
    const res = await fetch('/api/connections');
    if (!res.ok) throw new Error(`Response status: ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`error: ${message}`);
    return [];
  }
}

export async function addCompanyAndJobs(data: AddCompanyAndJobRequest): Promise<any | null> {
  try {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Response status: ${res.status}`);
    const json = await res.json();
    return json.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`error: ${message}`);
    return null;
  }
}

export async function getCompanies(): Promise<any[]> {
  try {
    const res = await fetch('/api/companies');
    if (!res.ok) throw new Error(`Response status: ${res.status}`);
    const json = await res.json();

    return json.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`error: ${message}`);
    return [];
  }
}

export async function getJobs({
  pageNum,
  resultsPerPage,
  titleQuery,
  minYears,
}: {
  pageNum?: number;
  resultsPerPage?: number;
  titleQuery?: string;
  minYears?: string;
}) {
  try {
    const res = await fetch('/api/jobsFeed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageNum, resultsPerPage, titleQuery, minYears }),
    });
    if (!res.ok) throw new Error(`Response status: ${res.status}`);
    const json = await res.json();

    return json.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`error: ${message}`);
    return {};
  }
}

export async function searchCompany(data: SearchCompanyRequest) {
  const res = await fetch('/api/searchCompany', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  return json.data;
}
