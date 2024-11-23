import fastify from 'fastify'
import {dataEndpoint, imageEndpoint} from "./routes/state-endpoint";
import RoomRoute from "./routes/room-endpoint";
import DeviceRoute from "./routes/device-endpoint";
import EWSUserRoute from "./routes/ewsuser-endpoint";
import {Logging} from "./logging";
import {IDBClient} from "./db/IDBClient";
import {ConfigManager} from "./ConfigManager";
import OrganizationRoute from "./routes/organization-endpoint";

const server = fastify()

const dbClient: IDBClient = ConfigManager.instance.getDBClient()

dbClient.getOrganization().then(org => {
    if (org) {
        process.env.TZ = org.timezone;
    }
})



server.register(dataEndpoint, { prefix: "/data" })
server.register(imageEndpoint, { prefix: "/image" })
server.register(RoomRoute)
server.register(DeviceRoute)
server.register(EWSUserRoute)
server.register(OrganizationRoute)



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
