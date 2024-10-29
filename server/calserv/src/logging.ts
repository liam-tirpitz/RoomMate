import * as winston from "winston";


export class Logging {
    static #instance: Logging;

    private _logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.json()
        ),
        defaultMeta: {},
        transports: [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
        ],
    });

    private constructor() {
        this._logger.add(new winston.transports.Console({
            format: winston.format.simple(),
        }));

    }

    public static get instance(): Logging {
        if (!Logging.#instance) {
            Logging.#instance = new Logging();
        }
        return Logging.#instance;
    }


    get logger(): winston.Logger {
        return this._logger;
    }
}

