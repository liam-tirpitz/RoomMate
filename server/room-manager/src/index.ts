import fastify from 'fastify'
import {dataEndpoint, imageEndpoint} from "./routes/state-endpoint";
import {Logging} from "./logging";
import {IDBClient} from "./db/IDBClient";
import {ConfigManager} from "./ConfigManager";
import {ManagementApi} from "./routes/management-api";

const server = fastify()

const dbClient: IDBClient = ConfigManager.instance.getDBClient()

dbClient.getOrganization().then(org => {
    if (org) {
        process.env.TZ = org.timezone;
    }
})



server.register(dataEndpoint, { prefix: "/data" })
server.register(imageEndpoint, { prefix: "/image" })
server.register(ManagementApi)

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

server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        Logging.instance.logger.error(err)
        process.exit(1)
    }
    Logging.instance.logger.info(`Server listening at ${address}`)
})
