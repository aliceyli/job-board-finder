import express from "express";
import { getAllConnections } from "./controllers/connectionController";
import { getAllCompanies } from "./controllers/companiesController";
import { getJobsFeed } from "./controllers/jobsController";

const app = express();

app.use(express.json());

app.get("/connections", getAllConnections);

app.get("/companies", getAllCompanies);

app.get("/jobsFeed", getJobsFeed);

export default app;
