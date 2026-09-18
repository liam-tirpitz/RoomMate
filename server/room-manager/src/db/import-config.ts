// npm run import-config [path/to/calendars.json]
// Imports a calendars.json into the SQLite database at DB_PATH. The database must not contain a configuration yet.
import fs from "fs";
import {SqliteDBClient} from "./SqliteDBClient";
import {CALENDARS_JSON_PATH, importCalendarsJson} from "./importCalendarsJson";
import {DEFAULT_DB_PATH} from "../ConfigManager";

async function main() {
    const path = process.argv[2] ?? CALENDARS_JSON_PATH
    const dbPath = process.env.DB_PATH ?? DEFAULT_DB_PATH
    const client = new SqliteDBClient(dbPath)
    try {
        const summary = await importCalendarsJson(client, JSON.parse(fs.readFileSync(path, "utf8")))
        console.log(`Imported ${path} into ${dbPath}:`, summary)
    } finally {
        client.close()
    }
}

main().catch(error => {
    console.error(error.message)
    process.exit(1)
})
