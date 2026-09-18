import {FileDBClient} from "./db/FileDBClient";
import {IDBClient} from "./db/IDBClient";
import {SqliteDBClient} from "./db/SqliteDBClient";
import {importCalendarsJsonIfEmpty} from "./db/importCalendarsJson";
import {Logging} from "./logging";

// Inside config/ so it lives in the volume the deployments already mount
export const DEFAULT_DB_PATH = "config/roommate.sqlite"

export class ConfigManager {
    client: IDBClient

    static #instance: ConfigManager;

    constructor() {
        const storage = process.env.STORAGE ?? "FILE"
        if (storage == "SQLITE") {
            const path = process.env.DB_PATH ?? DEFAULT_DB_PATH
            Logging.instance.logger.info(`Starting with SQLite Backend (${path})`)
            this.client = new SqliteDBClient(path)
            return
        }
        if (storage != "FILE") {
            Logging.instance.logger.warn(`Unknown STORAGE "${storage}", falling back to the file backend`)
        }
        Logging.instance.logger.info("Starting with File Backend")
        this.client = FileDBClient.instance
    }

    public static get instance(): ConfigManager {
        if (!ConfigManager.#instance) {
            ConfigManager.#instance = new ConfigManager();
        }

        return ConfigManager.#instance;
    }

    public getDBClient(): IDBClient {
        return this.client
    }

    // Opening the SQLite database already ran the migrations; fill an empty one from calendars.json
    public async init(): Promise<void> {
        if (this.client instanceof SqliteDBClient) {
            await importCalendarsJsonIfEmpty(this.client)
        }
    }


}
