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

server.addHook('onError', async (request, reply, error) => {
    Logging.instance.logger.error({
        message: error.message,
        stack: error.stack,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
    });

    if (error.name === 'ValidationError') {
        reply
            .code(400)
            .send({error: error.message})
    } else if (error.statusCode) {
        reply
            .code(error.statusCode)
            .send({ error: error.message });
    } else {
        reply
            .code(500)
            .send({ error: error.message });

    }



})

async function start() {
    // Open the database (runs migrations and the first-start import) before accepting requests
    await ConfigManager.instance.init()
    const dbClient: IDBClient = ConfigManager.instance.getDBClient()
    const org = await dbClient.getOrganization()
    if (org) {
        process.env.TZ = org.timezone;
    }
    const address = await server.listen({ port: Number(process.env.PORT ?? 3001), host:'0.0.0.0' })
    Logging.instance.logger.info(`Server listening at ${address}`)
}

start().catch(err => {
    Logging.instance.logger.error(err)
    process.exit(1)
})
