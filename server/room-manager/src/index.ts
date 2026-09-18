import fastify from 'fastify'
import {dataEndpoint, imageEndpoint} from "./routes/state-endpoint";
import {Logging} from "./logging";
import {IDBClient} from "./db/IDBClient";
import {ConfigManager} from "./ConfigManager";
import {ManagementApi} from "./routes/management-api";

const server = fastify()

server.register(dataEndpoint, { prefix: "/data" })
server.register(imageEndpoint, { prefix: "/image" })
server.register(ManagementApi, { prefix: "/api" })

if (!process.env.API_TOKEN) {
    Logging.instance.logger.warn("API_TOKEN is not set, the management API is disabled.")
}



server.addHook('preHandler', async (request, reply) => {
    reply.header('Content-Type', 'application/json')
})

// Every error answers {error: message}, which the web UI shows. Validation errors from the schemas carry 400.
server.setErrorHandler(async (error, request, reply) => {
    Logging.instance.logger.error({
        message: error.message,
        stack: error.stack,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
    });

    const statusCode = error.name === 'ValidationError' ? 400 : (error.statusCode ?? 500)
    reply
        .code(statusCode)
        .send({ error: error.message })
})

// Battery samples older than this are deleted once a day
const BATTERY_HISTORY_DAYS = Number(process.env.BATTERY_HISTORY_DAYS ?? 90)

async function pruneBatteryHistory() {
    const olderThan = new Date(Date.now() - BATTERY_HISTORY_DAYS * 24 * 60 * 60_000).toISOString()
    try {
        const removed = await ConfigManager.instance.getDBClient().pruneBatterySamples(olderThan)
        if (removed) Logging.instance.logger.info(`Removed ${removed} battery samples older than ${BATTERY_HISTORY_DAYS} days`)
    } catch (err) {
        Logging.instance.logger.error("Could not prune the battery history", {error: err.message})
    }
}

async function start() {
    // Open the database (runs migrations and the first-start import) before accepting requests
    await ConfigManager.instance.init()
    const dbClient: IDBClient = ConfigManager.instance.getDBClient()
    const org = await dbClient.getOrganization()
    if (org) {
        process.env.TZ = org.timezone;
    }
    await pruneBatteryHistory()
    setInterval(pruneBatteryHistory, 24 * 60 * 60_000).unref()
    const address = await server.listen({ port: Number(process.env.PORT ?? 3001), host:'0.0.0.0' })
    Logging.instance.logger.info(`Server listening at ${address}`)
}

start().catch(err => {
    Logging.instance.logger.error(err)
    process.exit(1)
})
