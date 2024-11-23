import {FileDBClient} from "./db/FileDBClient";
import {MongoDBClient} from "./db/MongoDBClient";
import {IDBClient} from "./db/IDBClient";

export class ConfigManager {
    fileClient: FileDBClient
    mongoClient: MongoDBClient

    static #instance: ConfigManager;

    constructor() {
        this.fileClient = FileDBClient.instance
        this.mongoClient = MongoDBClient.instance

    }

    public static get instance(): ConfigManager {
        if (!ConfigManager.#instance) {
            ConfigManager.#instance = new ConfigManager();
        }

        return ConfigManager.#instance;
    }

    public getDBClient(): IDBClient {
        return this.fileClient
    }


}