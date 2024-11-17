import {MongoDBClient} from "../db/MongoDBClient";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {IDevice} from "../../../datamodels/IDevice";

interface deviceParams {
    deviceId: string;
}

const DeviceRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/devices', {}, async (request, reply) => {
        try {
            const rooms = MongoDBClient.instance.getDevices()
            reply
                .code(200)
                .header('Content-Type', 'application/json')
                .send(JSON.stringify(await rooms))
        } catch (error) {
            console.log(error);
            return reply.code(500).send();
        }
    });

    server.post<{ Body: IDevice }>('/devices', {}, async (request, reply) => {
        try {
            await MongoDBClient.instance.addDevice((await request).body)
            reply
                .code(201)
                .header('Content-Type', 'application/json')
                .send()
        } catch (error) {
            request.log.error(error);
            return reply.send(500);
        }
    });

    server.put<{ Params: deviceParams, Body: IDevice }>('/devices/:deviceId', {}, async (request, reply) => {
        try {
            const ID = request.params.deviceId;
            await MongoDBClient.instance.updateDevice(ID, (await request).body)
            reply
                .code(201)
                .header('Content-Type', 'application/json')
                .send()
        } catch (error) {
            request.log.error(error);
            return reply.send(400);
        }
    });


    server.get<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        try {
            const ID = request.params.deviceId;
            const room = await MongoDBClient.instance.getDevice(ID)
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

    server.delete<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        try {
            const ID = request.params.deviceId;
            await MongoDBClient.instance.deleteDevice(ID)
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
export default fp(DeviceRoute);
