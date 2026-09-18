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
import {RequestHandler} from "../RequestHandler";
import {deviceCreateBody, deviceUpdateBody, isUniqueViolation} from "./schemas";

const requestHandler = new RequestHandler()
const DAY_MS = 24 * 60 * 60_000

interface deviceParams {
    deviceId: string;
}

async function checkRoomExists(room_id: IDevice['room_id']) {
    if (room_id != null && !await ConfigManager.instance.getDBClient().getRoom(String(room_id))) {
        throw new AppError(`Unknown room "${room_id}".`, 400)
    }
}

const DeviceRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    // Devices are addressed by their MAC without colons; unconfigured devices are included
    server.get('/devices', {}, async (request, reply) => {
        const client = ConfigManager.instance.getDBClient()
        const [devices, organization] = await Promise.all([client.getDevicesWithRooms(), client.getOrganization()])
        const now = new Date()
        return devices.map(({room, ...device}) => toDeviceStatus(device, room, organization, now))
    });

    // Devices usually add themselves on their first request; this registers one ahead of time
    server.post<{ Body: IDevice }>('/devices', {schema: {body: deviceCreateBody}}, async (request, reply) => {
        await checkRoomExists(request.body.room_id)
        try {
            const result = await ConfigManager.instance.getDBClient().addDevice(request.body)
            reply
                .code(201)
                .send(result)
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new AppError(`Device ${request.body.device_id} already exists.`, 409)
            }
            throw error
        }
    });

    // Only location and room can be changed
    server.put<{ Params: deviceParams, Body: Pick<IDevice, 'location' | 'room_id'> }>('/devices/:deviceId', {schema: {body: deviceUpdateBody}}, async (request, reply) => {
        const ID = request.params.deviceId;
        await checkRoomExists(request.body.room_id)
        const client = ConfigManager.instance.getDBClient()
        const result = await client.updateDevice(ID, {device_id: ID, ...request.body} as IDevice)
        if (!result) {
            throw new AppError("Not Found",404);
        }
        return toDeviceStatus(result, await client.getRoomForDevice(ID), await client.getOrganization())
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

    // The screen the device received last, as it looks on the sign
    server.get<{ Params: deviceParams }>('/devices/:deviceId/screen.png', {}, async (request, reply) => {
        const screen = await ConfigManager.instance.getDBClient().getScreen(request.params.deviceId)
        if (!screen) {
            throw new AppError("No screen has been rendered for this device yet", 404);
        }
        reply
            .header('Content-Type', 'image/png')
            .header('Last-Modified', new Date(screen.rendered_at).toUTCString())
            .header('Cache-Control', 'no-cache')
            .send(screen.png)
    });

    // Renders the screen now without storing it or clearing a redraw request.
    // Without ?voltage= the device's last reported voltage is used, so the battery icon matches.
    server.get<{ Params: deviceParams, Querystring: { voltage?: number } }>('/devices/:deviceId/preview.png', {
        schema: {querystring: {type: 'object', properties: {voltage: {type: 'integer', minimum: 0}}}}
    }, async (request, reply) => {
        const ID = request.params.deviceId;
        const device = await ConfigManager.instance.getDBClient().getDevice(ID)
        if (!device) {
            throw new AppError("Not Found",404);
        }
        const voltage = request.query.voltage || device.battery_mv || undefined
        const png = await requestHandler.getImage(ID, voltage, true, {persist: false})
        reply
            .header('Content-Type', 'image/png')
            .header('Cache-Control', 'no-store')
            .send(png)
    });

    server.get<{ Params: deviceParams, Querystring: { days: number } }>('/devices/:deviceId/battery', {
        schema: {querystring: {type: 'object', properties: {days: {type: 'integer', minimum: 1, maximum: 366, default: 30}}}}
    }, async (request, reply) => {
        const to = new Date()
        const from = new Date(to.getTime() - request.query.days * DAY_MS)
        return ConfigManager.instance.getDBClient().getBatteryHistory(request.params.deviceId, from.toISOString(), to.toISOString())
    });

    // The device fetches a new image on its next wake-up, even if nothing on the screen changed
    server.post<{ Params: deviceParams }>('/devices/:deviceId/redraw', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        const client = ConfigManager.instance.getDBClient()
        if (!await client.getDevice(ID)) {
            throw new AppError("Not Found",404);
        }
        await client.setRedrawRequested(ID, true)
        reply
            .code(204)
            .send()
    });

    server.delete<{ Params: deviceParams }>('/devices/:deviceId', {}, async (request, reply) => {
        const ID = request.params.deviceId;
        if (!await ConfigManager.instance.getDBClient().deleteDevice(ID)) {
            throw new AppError("Not Found",404);
        }
        reply
            .code(204)
            .send()

    });
};
export default fp(DeviceRoute);
