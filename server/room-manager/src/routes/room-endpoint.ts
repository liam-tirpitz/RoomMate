import {RequestHandler} from "../RequestHandler";
import {FastifyReply, FastifyRequest} from "fastify";

const requestHandler: RequestHandler = new RequestHandler()

export function roomEndpoint(fastify, _, done) {

    fastify.get("/", getRooms);
    fastify.get("/:room", getRoom);


    done();
}

async function getRoom(request: FastifyRequest, reply: FastifyReply)  {
}

async function getRooms(request: FastifyRequest, reply: FastifyReply)  {
}
