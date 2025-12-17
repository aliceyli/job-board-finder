"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const connectionController_1 = require("./controllers/connectionController");
const companiesController_1 = require("./controllers/companiesController");
const jobsController_1 = require("./controllers/jobsController");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/connections", connectionController_1.getAllConnections);
app.get("/companies", companiesController_1.getAllCompanies);
app.post("/searchCompany", companiesController_1.searchCompany);
app.get("/jobsFeed", jobsController_1.getJobsFeed);
exports.default = app;
