import {RequestHandler} from "../RequestHandler";
import {FastifyReply, FastifyRequest} from "fastify";
import {MongoDBClient} from "../db/MongoDBClient";
import {IRoom} from "../datamodels/IRoom";

const requestHandler: RequestHandler = new RequestHandler()

export function roomEndpoint(fastify, _, done) {

    fastify.get("/", getRooms);
    fastify.get("/:roomId", getRoom);
    fastify.delete("/:roomId", deleteRoom)
    fastify.post("/", addRoom)
    done();
}

async function getRoom(request: FastifyRequest, reply: FastifyReply)  {
    const { roomId } = request.params;
    const room = MongoDBClient.instance.getRoom(roomId)
    reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send(JSON.stringify(await room))
}

async function addRoom(request: FastifyRequest, reply: FastifyReply){
    const room: IRoom = request.body
    await MongoDBClient.instance.addRoom(room)
    reply
        .code(201)
        .header('Content-Type', 'application/json')
        .send()
}

async function getRooms(request: FastifyRequest, reply: FastifyReply)  {
    const rooms = MongoDBClient.instance.getRooms()
    reply
        .code(200)
        .header('Content-Type', 'application/json')
        .send(JSON.stringify(await rooms))
}

async function deleteRoom(request: FastifyRequest, reply: FastifyReply) {
    const { roomId } = request.params;
    await MongoDBClient.instance.deleteRoom(roomId)
    reply
        .code(204)
        .header('Content-Type', 'application/json')
        .send()
}