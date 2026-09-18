import {FileDBClient} from "./db/FileDBClient";
import {IDBClient} from "./db/IDBClient";
import {Logging} from "./logging";

export class ConfigManager {
    client: IDBClient

    static #instance: ConfigManager;

    constructor() {
        // The Mongo backend was removed; a writable SQLite backend replaces it (see PLAN-webapp.md)
        if (process.env.STORAGE && process.env.STORAGE != "FILE") {
            Logging.instance.logger.warn(`Unknown STORAGE "${process.env.STORAGE}", falling back to the file backend`)
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


}