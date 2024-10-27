import fastify from 'fastify'
import * as config from "../config/calendars.json"
import {RequestHandler} from "./RequestHandler";

const server = fastify()
const requestHandler: RequestHandler = new RequestHandler()

process.env.TZ = config.global_config.timezoe;


['/occupancy', '/image'].forEach(path => {
    server.get(path, async (request, reply) => {
        const devid = request.query['devid']
        const result = await requestHandler.getImage(devid)
        if (result) {
            reply
                .code(200)
                //.header('Content-Type', 'image/example')
                .send(result)
        } else {
            reply.statusCode = 404
            reply
                .code(200)
                .send("Device-ID not found.")
        }
    })
})

server.get("/data", async (request, reply) => {
    const devid = request.query['devid']

    const result = await requestHandler.getData(devid)
    if (result) {
        reply
            .code(200)
            .header('Content-Type', 'application/json')
            .send(result)
    } else {
        reply.statusCode = 404
        reply
            .code(200)
            .send("Device-ID not found.")
    }
})


server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
