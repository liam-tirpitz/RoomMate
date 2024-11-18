import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {MongoDBClient} from "../db/MongoDBClient";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';

interface ewsParams {
    userId: string;
}

const EWSUserRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/ewsusers', {}, async (request, reply) => {
        try {
            const rooms = MongoDBClient.instance.getEwsUsers()
            reply
                .code(200)
                .header('Content-Type', 'application/json')
                .send(JSON.stringify(await rooms))
        } catch (error) {
            console.log(error);
            return reply.code(500).send();
        }
    });

    server.post<{ Body: IEWSTenant }>('/ewsusers', {}, async (request, reply) => {
        try {
            await MongoDBClient.instance.addEwsUser((await request).body)
            reply
                .code(201)
                .header('Content-Type', 'application/json')
                .send()
        } catch (error) {
            request.log.error(error);
            return reply.send(500);
        }
    });

    server.put<{ Params: ewsParams, Body: IEWSTenant }>('/ewsusers/:userId', {}, async (request, reply) => {
        try {
            const ID = request.params.userId;
            await MongoDBClient.instance.updateEwsUser(ID, (await request).body)
            reply
                .code(201)
                .header('Content-Type', 'application/json')
                .send()
        } catch (error) {
            request.log.error(error);
            return reply.send(400);
        }
    });


    server.get<{ Params: ewsParams }>('/ewsusers/:userId', {}, async (request, reply) => {
        try {
            const ID = request.params.userId;
            const room = await MongoDBClient.instance.getEwsUser(ID)
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

    server.delete<{ Params: ewsParams }>('/ewsusers/:userId', {}, async (request, reply) => {
        try {
            const ID = request.params.userId;
            await MongoDBClient.instance.deleteEwsUser(ID)
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
export default fp(EWSUserRoute);
