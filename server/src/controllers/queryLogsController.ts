import { Request, Response } from "express";
import { query } from "../db";

export async function insertQueryLog({
  raw_query,
  normalized_query,
  found,
  errors,
}: {
  raw_query: string;
  normalized_query: string;
  found: boolean;
  errors: string[];
}) {
  const addJobQuery = `INSERT INTO query_logs (
            raw_query, 
            normalized_query,
            found,
            errors
        ) 
        values ($1,$2,$3,$4) 
        RETURNING *`;

  return await query(addJobQuery, [raw_query, normalized_query, found, errors]);
}
