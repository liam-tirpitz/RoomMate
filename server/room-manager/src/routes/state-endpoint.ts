import {Logging} from "../logging";
import {RequestHandler} from "../RequestHandler";
import {MongoDBClient} from "../db/MongoDBClient";
import {FastifyReply, FastifyRequest} from "fastify";

const requestHandler: RequestHandler = new RequestHandler()


export function imageEndpoint(fastify, _, done) {

    fastify.get("/", getImage);

    done();
}

async function getImage(request: FastifyRequest, reply: FastifyReply)  {
    const devid = request.query['devid']
    const voltage = request.query['voltage']
    const test = { devid: devid, voltage: voltage};
    Logging.instance.logger.info('Image requested', test);
    const result = await requestHandler.getImage(devid, voltage)
    if (result) {
        Logging.instance.logger.verbose('Image sent', test);
        reply
            .code(200)
            .header('Content-Type', 'text/plain')
            .send(result)
    } else {
        Logging.instance.logger.warn('Device-ID not found.', test);

        reply
            .code(200)
            .send("Device-ID not found.")
    }
}

export function dataEndpoint(fastify, _, done) {
    fastify.get("/", getData);

    done();
}

async function getData(request: FastifyRequest, reply: FastifyReply) {
    const devid = request.query['devid']
    const result = await requestHandler.getData(devid)
    if (result) {
        reply
            .code(200)
            .send(result)
    } else {
        reply.statusCode = 404
        Logging.instance.logger.warn('Device-ID not found.', { devid: devid});
        reply
            .code(200)
            .send("Device-ID not found.")
    }
}

