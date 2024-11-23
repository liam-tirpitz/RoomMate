import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";

interface ewsParams {
    userId: string;
}

const EWSUserRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/ewsusers', {}, async (request, reply) => {
        const rooms = ConfigManager.instance.getDBClient().getEwsUsers()
        return JSON.stringify(await rooms)
    });

    server.post<{ Body: IEWSTenant }>('/ewsusers', {}, async (request, reply) => {
        const result = await ConfigManager.instance.getDBClient().addEwsUser((await request).body)
        reply
            .code(201)
            .send(result)
    });

    server.put<{ Params: ewsParams, Body: IEWSTenant }>('/ewsusers/:userId', {}, async (request, reply) => {
        const ID = request.params.userId;
        const result = await ConfigManager.instance.getDBClient().updateEwsUser(ID, (await request).body)
        reply
            .code(201)
            .send(result)
    });


    server.get<{ Params: ewsParams }>('/ewsusers/:userId', {}, async (request, reply) => {
        const ID = request.params.userId;
        const room = await ConfigManager.instance.getDBClient().getEwsUser(ID)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        return JSON.stringify(await room)
    });

    server.delete<{ Params: ewsParams }>('/ewsusers/:userId', {}, async (request, reply) => {
        const ID = request.params.userId;
        await ConfigManager.instance.getDBClient().deleteEwsUser(ID)
        reply
            .code(204)
            .send()
    });
};
export default fp(EWSUserRoute);
