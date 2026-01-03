import { Request, Response } from "express";
import { query } from "../db";
import { Company } from "../model/companies";

interface GetCompaniesResponse {
  data: Company[];
  error?: string;
}

export async function getAllCompanies(
  _req: Request,
  res: Response<GetCompaniesResponse>
) {
  try {
    const result = await query(
      `
      SELECT 
        c.id, 
        c.name, 
        c.board, 
        c.board_url, 
        c.slug, 
        c.created_at, 
        c.updated_at, 
        COUNT(j.id) as job_count
      FROM companies c 
      LEFT JOIN jobs j ON c.id = j.company_id 
      GROUP BY 
        c.id, 
        c.name, 
        c.board, 
        c.board_url, 
        c.slug, 
        c.created_at, 
        c.updated_at
      ORDER BY c.updated_at DESC
      LIMIT 100;
      `
    );
    res.json({ data: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("error getting companies:", err);
    res.status(500).json({ data: [], error: message });
  }
}
