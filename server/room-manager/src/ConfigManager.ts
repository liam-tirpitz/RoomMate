import {FileDBClient} from "./db/FileDBClient";
import {MongoDBClient} from "./db/MongoDBClient";
import {IDBClient} from "./db/IDBClient";
import {Logging} from "./logging";

export class ConfigManager {
    client: IDBClient

    static #instance: ConfigManager;

    constructor() {
        if (process.env.STORAGE == "MONGO") {
            Logging.instance.logger.info("Starting with MongoDB Backend")
            this.client = MongoDBClient.instance
        } else {
            Logging.instance.logger.info("Starting with File Backend")
            this.client = FileDBClient.instance
        }
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