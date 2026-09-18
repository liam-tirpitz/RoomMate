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

const requestHandler = new RequestHandler()
const DAY_MS = 24 * 60 * 60_000

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
        await ConfigManager.instance.getDBClient().deleteDevice(ID)
        reply
            .code(204)
            .send()

    });
};
export default fp(DeviceRoute);
