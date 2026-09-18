import {IRoom} from "../../../datamodels/IRoom";
import {IEWSCalendarInfo} from "../../../datamodels/IEWSCalendarInfo";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {roomBody} from "./schemas";
import {logoExists} from "../logos";
import {RequestHandler} from "../RequestHandler";

interface roomParams {
    roomId: string;
}

const requestHandler = new RequestHandler()

// The rules the schema cannot express. Returns the room with the unused calendar sources removed.
async function checkRoom(room: IRoom): Promise<IRoom> {
    const sources = [room.ews_info, room.ical_info, room.persons].filter(source => source != null)
    if (sources.length != 1) {
        throw new AppError("A room needs exactly one of ews_info (Exchange room), ical_info (iCal room) or persons (office).", 400)
    }
    const client = ConfigManager.instance.getDBClient()
    const calendars: IEWSCalendarInfo[] = [room.ews_info, ...(room.persons ?? []).map(person => person.ews_info)].filter(info => info)
    for (const calendar of calendars) {
        if (!await client.getEwsUser(calendar.tenant_id)) {
            throw new AppError(`Unknown tenant "${calendar.tenant_id}" for ${calendar.email}.`, 400)
        }
    }
    if (!logoExists(room.logo)) {
        throw new AppError(`Unknown logo "${room.logo}". Upload it first.`, 400)
    }
    return {
        ...room,
        room_number: room.room_number ?? null,
        ews_info: room.ews_info ?? undefined,
        ical_info: room.ical_info ?? undefined,
        persons: room.persons ?? undefined,
    }
}

const RoomRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/rooms', {}, async (request, reply) => {
        return ConfigManager.instance.getDBClient().getRooms()
    });

    server.post<{ Body: IRoom }>('/rooms', {schema: {body: roomBody}}, async (request, reply) => {
        const result = await ConfigManager.instance.getDBClient().addRoom(await checkRoom(request.body))
        reply
            .code(201)
            .send(result)
    });

    server.put<{ Params: roomParams, Body: IRoom }>('/rooms/:roomId', {schema: {body: roomBody}}, async (request, reply) => {
        const ID = request.params.roomId;
        const result = await ConfigManager.instance.getDBClient().updateRoom(ID, await checkRoom(request.body))
        if (!result) {
            throw new AppError("Not Found",404);
        }
        return result
    });


    server.get<{ Params: roomParams }>('/rooms/:roomId', {}, async (request, reply) => {
        const ID = request.params.roomId;
        const room = await ConfigManager.instance.getDBClient().getRoom(ID)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        return room
    });

    // Renders the room with its current calendar, without a device
    server.get<{ Params: roomParams }>('/rooms/:roomId/preview.png', {}, async (request, reply) => {
        const room = await ConfigManager.instance.getDBClient().getRoom(request.params.roomId)
        if (!room) {
            throw new AppError("Not Found",404);
        }
        reply
            .header('Content-Type', 'image/png')
            .header('Cache-Control', 'no-store')
            .send(await requestHandler.getRoomPreview(room))
    });

    // Devices that showed the room become unconfigured
    server.delete<{ Params: roomParams }>('/rooms/:roomId', {}, async (request, reply) => {
        const ID = request.params.roomId;
        if (!await ConfigManager.instance.getDBClient().deleteRoom(ID)) {
            throw new AppError("Not Found",404);
        }
        reply
            .code(204)
            .send()
    });
};
export default fp(RoomRoute);
