import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {MongoDBClient} from "../db/MongoDBClient";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";

interface ewsParams {
    userId: string;
}

const EWSUserRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/ewsusers', {}, async (request, reply) => {
        const rooms = MongoDBClient.instance.getEwsUsers()
        return JSON.stringify(await rooms)
    });

    server.post<{ Body: IEWSTenant }>('/ewsusers', {}, async (request, reply) => {
        const result = await MongoDBClient.instance.addEwsUser((await request).body)
        reply
            .code(201)
            .send(result)
    });

    server.put<{ Params: ewsParams, Body: IEWSTenant }>('/ewsusers/:userId', {}, async (request, reply) => {
        const ID = request.params.userId;
        const result = await MongoDBClient.instance.updateEwsUser(ID, (await request).body)
        reply
            .code(201)
            .send(result)
    });


    server.get<{ Params: ewsParams }>('/ewsusers/:userId', {}, async (request, reply) => {
        const ID = request.params.userId;
        const room = await MongoDBClient.instance.getEwsUser(ID)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        return JSON.stringify(await room)
    });

    server.delete<{ Params: ewsParams }>('/ewsusers/:userId', {}, async (request, reply) => {
        const ID = request.params.userId;
        await MongoDBClient.instance.deleteEwsUser(ID)
        reply
            .code(204)
            .send()
    });
};
export default fp(EWSUserRoute);
