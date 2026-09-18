import {afterEach, describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import fastify from "fastify";
import {RequestHandler} from "../src/RequestHandler";
import {dataEndpoint, imageEndpoint} from "../src/routes/state-endpoint";

const ICAL_ROOM = {
    room_number: 100,
    id_string: "100",
    name: "Test Room",
    logo: "institute_logo.png",
    ical_info: {endpoint: "https://calendar.example.com/room.ics"},
}

function handlerWithRoom(): RequestHandler {
    const handler = new RequestHandler()
    const dataRetrieval = Object.create(handler.dataRetrieval)
    dataRetrieval.getDeviceFromHardwareID = async (id: string) =>
        id == "aabbccddeeff" ? {device_id: id, location: "", room_id: ICAL_ROOM} : undefined
    handler.dataRetrieval = dataRetrieval
    handler.iCalClient.getCalendar = async () => ({})
    return handler
}

async function hashAt(handler: RequestHandler, now: Date): Promise<string> {
    mock.timers.enable({apis: ["Date"], now: now})
    try {
        return JSON.parse(await handler.getData("aabbccddeeff")).hash
    } finally {
        mock.timers.reset()
    }
}

describe("RequestHandler.getData", () => {
    afterEach(() => mock.timers.reset())

    it("returns null for an unknown device", async () => {
        assert.equal(await handlerWithRoom().getData("000000000000"), null)
    })

    it("keeps the hash within a day and changes it on the next day", async () => {
        const handler = handlerWithRoom()
        const noon = await hashAt(handler, new Date(2026, 8, 16, 12, 0))
        const afternoon = await hashAt(handler, new Date(2026, 8, 16, 14, 0))
        const next_day = await hashAt(handler, new Date(2026, 8, 17, 12, 0))

        assert.equal(noon, afternoon)
        assert.notEqual(noon, next_day)
    })
})

describe("state endpoints", () => {
    it("answer 404 with a JSON body on /data for an unknown device", async () => {
        const server = fastify()
        server.register(dataEndpoint, {prefix: "/data"})
        server.register(imageEndpoint, {prefix: "/image"})

        const response = await server.inject({method: "GET", url: "/data?devid=000000000000"})

        assert.equal(response.statusCode, 404)
        assert.deepEqual(response.json(), {error: "Device-ID not found."})
        await server.close()
    })
})
