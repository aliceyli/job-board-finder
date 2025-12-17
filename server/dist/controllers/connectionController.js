"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnections = getConnections;
exports.getAllConnections = getAllConnections;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const csv_parse_1 = require("csv-parse");
const CONNECTION_COLUMNS = [
    "firstName",
    "lastName",
    "url",
    "email",
    "company",
    "position",
    "connectedOn",
];
function getConnections() {
    const filePath = path_1.default.join(process.cwd(), "src", "connections.csv");
    return new Promise((resolve, reject) => {
        const connections = [];
        (0, fs_1.createReadStream)(filePath)
            .pipe((0, csv_parse_1.parse)({ columns: CONNECTION_COLUMNS, from: 2, skip_empty_lines: true }))
            .on("data", (row) => {
            connections.push(row);
        })
            .on("end", () => resolve(connections))
            .on("error", (err) => reject(err));
    });
}
async function getAllConnections(_req, res) {
    try {
        const data = await getConnections();
        res.json({ data });
    }
    catch (err) {
        console.error("Failed to load connections", err);
        res.status(500).json({ error: "Failed to load connections" });
    }
}
