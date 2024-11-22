import {MongoDBClient} from "../db/MongoDBClient";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {IDevice} from "../../../datamodels/IDevice";
import {AppError} from "../datamodels/AppError";

interface deviceParams {
    deviceId: string;
}

const DeviceRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/devices', {}, async (request, reply) => {
        const rooms = MongoDBClient.instance.getDevices()
        return JSON.stringify(await rooms)
    });

    server.post<{ Body: IDevice }>('/devices', {}, async (request, reply) => {
            const result = await MongoDBClient.instance.addDevice((await request).body)
            reply
                .code(201)
                .send(result)
    });

    server.put<{ Params: deviceParams, Body: IDevice }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        const result = await MongoDBClient.instance.updateDevice(ID, (await request).body)
        reply
            .code(201)
            .send(result)
    });


    server.get<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        const room = await MongoDBClient.instance.getDevice(ID)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        return JSON.stringify(await room)
    });

    server.delete<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        await MongoDBClient.instance.deleteDevice(ID)
        reply
            .code(204)
            .send()

    });
};
export default fp(DeviceRoute);
