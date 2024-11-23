import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {IDevice} from "../../../datamodels/IDevice";
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";

interface deviceParams {
    deviceId: string;
}

const DeviceRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/devices', {}, async (request, reply) => {
        const rooms = ConfigManager.instance.getDBClient().getDevices()
        return JSON.stringify(await rooms)
    });

    server.post<{ Body: IDevice }>('/devices', {}, async (request, reply) => {
            const result = await ConfigManager.instance.getDBClient().addDevice((await request).body)
            reply
                .code(201)
                .send(result)
    });

    server.put<{ Params: deviceParams, Body: IDevice }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        const result = await ConfigManager.instance.getDBClient().updateDevice(ID, (await request).body)
        reply
            .code(201)
            .send(result)
    });


    server.get<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        const room = await ConfigManager.instance.getDBClient().getDevice(ID)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        return JSON.stringify(await room)
    });

    server.delete<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        await ConfigManager.instance.getDBClient().deleteDevice(ID)
        reply
            .code(204)
            .send()

    });
};
export default fp(DeviceRoute);
