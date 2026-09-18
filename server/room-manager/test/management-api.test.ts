import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import fastify, {FastifyInstance} from "fastify";
import {ManagementApi} from "../src/routes/management-api";
import {dataEndpoint} from "../src/routes/state-endpoint";
import {ConfigManager} from "../src/ConfigManager";
import {IDBClient} from "../src/db/IDBClient";
import {SqliteDBClient} from "../src/db/SqliteDBClient";

const TOKEN = "test-token"

describe("management API", () => {
    let server: FastifyInstance

    beforeEach(() => {
        delete process.env.API_TOKEN
        server = fastify()
        server.register(dataEndpoint, {prefix: "/data"})
        server.register(ManagementApi, {prefix: "/api"})
    })
    afterEach(async () => {
        delete process.env.API_TOKEN
        await server.close()
    })

    it("is disabled when no API_TOKEN is configured", async () => {
        const response = await server.inject({method: "GET", url: "/api/ewsusers", headers: {authorization: "Bearer "}})
        assert.equal(response.statusCode, 403)
    })

    it("rejects requests without the right token", async () => {
        process.env.API_TOKEN = TOKEN
        for (const authorization of [undefined, "Bearer wrong", TOKEN]) {
            const headers = authorization ? {authorization} : {}
            const response = await server.inject({method: "GET", url: "/api/ewsusers", headers})
            assert.equal(response.statusCode, 401, `authorization: ${authorization}`)
            assert.equal(response.headers["www-authenticate"], "Bearer")
        }
    })

    it("answers reads with the right token", async () => {
        process.env.API_TOKEN = TOKEN
        const response = await server.inject({method: "GET", url: "/api/organization", headers: {authorization: `Bearer ${TOKEN}`}})
        assert.equal(response.statusCode, 200)
        assert.equal(JSON.parse(response.body).timezone, "Europe/Berlin")
    })

    it("answers 501 to writes on the file backend", async () => {
        process.env.API_TOKEN = TOKEN
        for (const [method, url] of [["POST", "/api/rooms"], ["PUT", "/api/devices/1"], ["DELETE", "/api/ewsusers/1"], ["POST", "/api/organization"]] as const) {
            const response = await server.inject({method, url, headers: {authorization: `Bearer ${TOKEN}`}, payload: {}})
            assert.equal(response.statusCode, 501, `${method} ${url}`)
        }
    })

    it("leaves the device endpoints open", async () => {
        process.env.API_TOKEN = TOKEN
        const response = await server.inject({method: "GET", url: "/data?devid=000000000000"})
        assert.equal(response.statusCode, 404)
    })

    it("answers /api/status without a token", async () => {
        const response = await server.inject({method: "GET", url: "/api/status"})
        assert.equal(response.statusCode, 200)
        const status = JSON.parse(response.body)
        assert.equal(status.storage, "FILE")
        assert.equal(status.writable, false)
        assert.equal(status.auth, "token")
        assert.equal(typeof status.version, "string")
    })

    it("confirms a valid token on /api/auth/me", async () => {
        process.env.API_TOKEN = TOKEN
        const rejected = await server.inject({method: "GET", url: "/api/auth/me", headers: {authorization: "Bearer wrong"}})
        assert.equal(rejected.statusCode, 401)
        const response = await server.inject({method: "GET", url: "/api/auth/me", headers: {authorization: `Bearer ${TOKEN}`}})
        assert.equal(response.statusCode, 200)
        assert.deepEqual(JSON.parse(response.body), {authenticated: true, method: "token"})
    })

    it("lists the configured devices with a status on the file backend", async () => {
        process.env.API_TOKEN = TOKEN
        const response = await server.inject({method: "GET", url: "/api/devices", headers: {authorization: `Bearer ${TOKEN}`}})
        assert.equal(response.statusCode, 200)
        const devices = JSON.parse(response.body)
        assert.ok(devices.length > 0)
        for (const device of devices) {
            assert.equal(device.room_id, device.device_id)
            assert.equal(device.room.id, device.device_id)
            assert.equal(device.status, "ok")
        }
    })
})

describe("management API on the SQLite backend", () => {
    let server: FastifyInstance
    let fileClient: IDBClient
    let client: SqliteDBClient
    const headers = {authorization: `Bearer ${TOKEN}`}

    beforeEach(async () => {
        process.env.API_TOKEN = TOKEN
        fileClient = ConfigManager.instance.client
        client = new SqliteDBClient(":memory:")
        ConfigManager.instance.client = client
        await client.setOrganization({
            name: "", external_identifier: "", soon_threshold_in_min: 15, night_start_hour: 19, night_end_hour: 8,
            timezone: "Europe/Berlin", low_battery_voltage_cutoff_in_mv: 3100, default_logo: "institute_logo.png",
        })
        server = fastify()
        server.register(ManagementApi, {prefix: "/api"})
    })
    afterEach(async () => {
        delete process.env.API_TOKEN
        ConfigManager.instance.client = fileClient
        client.close()
        await server.close()
    })

    it("reports a writable backend", async () => {
        const response = await server.inject({method: "GET", url: "/api/status"})
        assert.deepEqual({...JSON.parse(response.body), version: undefined}, {storage: "SQLITE", writable: true, version: undefined, auth: "token"})
    })

    it("lists configured and unconfigured devices", async () => {
        const room = await client.addRoom({
            room_number: 100, id_string: "100", name: "Room", logo: "institute_logo.png",
            ews_info: undefined, ical_info: {endpoint: "https://calendar.example.com/room.ics"}, persons: undefined,
        })
        await client.addDevice({device_id: "aaaaaaaaaaaa", location: "Door", room_id: room.id, last_contact: null, battery_mv: null})
        await client.touchDevice("aaaaaaaaaaaa", {last_contact: new Date().toISOString(), battery_mv: 3000})
        await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString(), battery_mv: 4000})

        const response = await server.inject({method: "GET", url: "/api/devices", headers})
        assert.equal(response.statusCode, 200)
        const devices = JSON.parse(response.body)
        assert.deepEqual(devices.map(device => [device.device_id, device.status, device.battery_percent]),
            [["aaaaaaaaaaaa", "low_battery", 0], ["deadbeef0000", "unconfigured", 50]])
        assert.deepEqual(devices[0].room, {id: room.id, name: "Room", id_string: "100"})
        assert.equal(devices[1].room, null)
    })

    it("returns a single device by MAC and 404 for an unknown one", async () => {
        await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString()})
        const response = await server.inject({method: "GET", url: "/api/devices/deadbeef0000", headers})
        assert.equal(response.statusCode, 200)
        assert.equal(JSON.parse(response.body).status, "unconfigured")
        const missing = await server.inject({method: "GET", url: "/api/devices/000000000000", headers})
        assert.equal(missing.statusCode, 404)
    })
})
