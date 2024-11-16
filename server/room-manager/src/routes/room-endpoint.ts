import {RequestHandler} from "../RequestHandler";
import {MongoDBClient} from "../db/MongoDBClient";
import {IRoom} from "../../../datamodels/IRoom";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';

interface roomParams {
    roomId: string;
}

const RoomRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {

    server.get('/', {}, async (request, reply) => {
        try {
            const rooms = MongoDBClient.instance.getRooms()
            reply
                .code(200)
                .header('Content-Type', 'application/json')
                .send(JSON.stringify(await rooms))
        } catch (error) {
            request.log.error(error);
            return reply.send(500);
        }
    });

    server.post<{ Body: IRoom }>('/', {}, async (request, reply) => {
        try {
            await MongoDBClient.instance.addRoom((await request).body)
            reply
                .code(201)
                .header('Content-Type', 'application/json')
                .send()
        } catch (error) {
            request.log.error(error);
            return reply.send(500);
        }
    });

    server.get<{ Params: roomParams }>('/:id', {}, async (request, reply) => {
        try {
            const ID = request.params.roomId;
            const room = await MongoDBClient.instance.getRoom(ID)
            if (!room) {
                return reply.send(404);
            }
            reply
                .code(200)
                .header('Content-Type', 'application/json')
                .send(JSON.stringify(await room))
        } catch (error) {
            request.log.error(error);
            return reply.send(400);
        }
    });

    server.delete<{ Params: roomParams }>('/:id', {}, async (request, reply) => {
        try {
            const ID = request.params.roomId;
            await MongoDBClient.instance.deleteRoom(ID)
            reply
                .code(204)
                .header('Content-Type', 'application/json')
                .send()
        } catch (error) {
            request.log.error(error);
            return reply.send(400);
        }
    });
};
export default fp(RoomRoute);
