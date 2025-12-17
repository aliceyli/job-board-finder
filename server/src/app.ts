import express from "express";
import { getAllConnections } from "./controllers/connectionController";
import {
  getAllCompanies,
  searchCompany,
} from "./controllers/companiesController";
import { getJobsFeed } from "./controllers/jobsController";

const app = express();

app.use(express.json());

app.get("/connections", getAllConnections);

app.get("/companies", getAllCompanies);
app.post("/searchCompany", searchCompany);

app.get("/jobsFeed", getJobsFeed);

export default app;
