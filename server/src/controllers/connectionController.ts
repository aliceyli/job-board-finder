import { createReadStream } from "fs";
import path from "path";
import { parse } from "csv-parse";
import { Request, Response } from "express";
import { Connection } from "../model/connection";

const CONNECTION_COLUMNS = [
  "firstName",
  "lastName",
  "url",
  "email",
  "company",
  "position",
  "connectedOn",
];

export function getConnections(): Promise<Connection[]> {
  const filePath = path.join(process.cwd(), "src", "connections.csv");

  return new Promise((resolve, reject) => {
    const connections: Connection[] = [];

    createReadStream(filePath)
      .pipe(
        parse({ columns: CONNECTION_COLUMNS, from: 2, skip_empty_lines: true })
      )
      .on("data", (row: Connection) => {
        connections.push(row);
      })
      .on("end", () => resolve(connections))
      .on("error", (err) => reject(err));
  });
}

export async function getAllConnections(_req: Request, res: Response) {
  try {
    const data = await getConnections();
    res.json({ data });
  } catch (err) {
    console.error("Failed to load connections", err);
    res.status(500).json({ error: "Failed to load connections" });
  }
}
