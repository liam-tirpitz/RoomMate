import {MongoDBClient} from "../db/MongoDBClient";
import {IRoom} from "../../../datamodels/IRoom";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";

interface roomParams {
    roomId: string;
}


const RoomRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/rooms', {}, async (request, reply) => {
        const rooms = await MongoDBClient.instance.getRooms()
        return JSON.stringify(rooms)
    });

    server.post<{ Body: IRoom }>('/rooms', {}, async (request, reply) => {
        const result = await MongoDBClient.instance.addRoom((await request).body)
        reply
            .code(201)
            .send(result)
    });

    server.put<{ Params: roomParams, Body: IRoom }>('/rooms/:roomId', {}, async (request, reply) => {
        const ID = request.params.roomId;
        const result = await MongoDBClient.instance.updateRoom(ID, (await request).body)
        reply
            .code(201)
            .send(result)
    });


    server.get<{ Params: roomParams }>('/rooms/:roomId', {}, async (request, reply) => {
        const ID = request.params.roomId;
        const room = await MongoDBClient.instance.getRoom(ID)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        return JSON.stringify(await room)

    });

    server.delete<{ Params: roomParams }>('/rooms/:roomId', {}, async (request, reply) => {
        const ID = request.params.roomId;
        await MongoDBClient.instance.deleteRoom(ID)
        reply
            .code(204)
            .send()
    });
};
export default fp(RoomRoute);
