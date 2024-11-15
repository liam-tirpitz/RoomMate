import {Logging} from "../logging";
import {RequestHandler} from "../RequestHandler";
import {MongoDBClient} from "../db/MongoDBClient";
import {FastifyReply, FastifyRequest} from "fastify";
import {R} from "tsx/dist/types-Cxp8y2TL";

const requestHandler: RequestHandler = new RequestHandler()

async function things() {
    const client = new MongoDBClient()
    // await client.deleteDevice("abc")
    // await client.addDevice({device_id: "abc", location: "sdfas"})
    console.log(await client.getDevices())
    console.log(await client.getRoomForDevice("aaaaaaaaaaaa"))
    console.log(await client.getDevice("abc"))
}

export function imageEndpoint(fastify, _, done) {

    fastify.get("/", getImage);

    done();
}

export async function getImage(request: FastifyRequest, reply: FastifyReply)  {
    things().then()
    const devid = request.query['devid']
    const voltage = request.query['voltage']
    const test = { devid: devid, voltage: voltage};
    Logging.instance.logger.info('Image requested', test);
    const result = await requestHandler.getImage(devid, voltage)
    if (result) {
        Logging.instance.logger.verbose('Image sent', test);
        reply
            .code(200)
            //.header('Content-Type', 'image/example')
            .send(result)
    } else {
        Logging.instance.logger.warn('Device-ID not found.', test);

        reply.statusCode = 404
        reply
            .code(200)
            .send("Device-ID not found.")
    }
}

export function dataEndpoint(fastify, _, done) {
    fastify.get("/", getData);

    done();
}

export async function getData(request: FastifyRequest, reply: FastifyReply) {
    const devid = request.query['devid']

    const result = await requestHandler.getData(devid)
    if (result) {
        reply
            .code(200)
            .header('Content-Type', 'application/json')
            .send(result)
    } else {
        reply.statusCode = 404
        Logging.instance.logger.warn('Device-ID not found.', { devid: devid});
        reply
            .code(200)
            .send("Device-ID not found.")
    }
}
