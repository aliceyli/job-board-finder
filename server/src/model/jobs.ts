export interface Job {
  id: number;
  title: string;
  company_id: number;
  location: string | null;
  url: string;
  team: string | null;
  employment_type: string | null;
  created_at: string;
}
