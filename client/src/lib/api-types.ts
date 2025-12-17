import { Job } from '../types';

// to-do: properly type api calls

export interface AddCompanyAndJobRequest {
  name: string;
  slug: string;
  board: string;
  boardUrl: string;
  jobs: Job[];
}

export interface SearchCompanyRequest {
  query: string;
}
