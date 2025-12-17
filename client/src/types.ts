export interface Job {
  id: number;
  title: string;
  location: string;
  url: string;
  team?: string;
  employmentType?: string;
  description: string;
}

export interface BoardResult {
  board: string;
  url: string;
  jobs: Job[];
}

export interface CompanyResult {
  company: string;
  slug?: string;
  board: string | null;
  boardUrl?: string;
  jobs: Job[];
  errors?: string[];
}
