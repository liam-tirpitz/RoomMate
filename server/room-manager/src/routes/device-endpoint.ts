import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {IDevice} from "../../../datamodels/IDevice";
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {toDeviceStatus} from "../deviceStatus";

interface deviceParams {
    deviceId: string;
}

const DeviceRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    // Devices are addressed by their MAC without colons; unconfigured devices are included
    server.get('/devices', {}, async (request, reply) => {
        const client = ConfigManager.instance.getDBClient()
        const [devices, organization] = await Promise.all([client.getDevicesWithRooms(), client.getOrganization()])
        const now = new Date()
        return devices.map(({room, ...device}) => toDeviceStatus(device, room, organization, now))
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
        const client = ConfigManager.instance.getDBClient()
        const device = await client.getDevice(ID)
        if (!device) {
            throw new AppError("Not Found",404);
        }
        const [room, organization] = await Promise.all([client.getRoomForDevice(ID), client.getOrganization()])
        return toDeviceStatus(device, room, organization)
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
