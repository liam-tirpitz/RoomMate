import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import fastify, {FastifyInstance} from "fastify";
import {dataEndpoint, imageEndpoint} from "../src/routes/state-endpoint";
import {ManagementApi} from "../src/routes/management-api";
import {ConfigManager} from "../src/ConfigManager";
import {IDBClient} from "../src/db/IDBClient";
import {SqliteDBClient} from "../src/db/SqliteDBClient";

const TOKEN = "test-token"
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const EVERYTHING = ["2000-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z"] as const

// The device endpoints and the management API on an in-memory SQLite database
describe("device telemetry", () => {
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
        server.register(dataEndpoint, {prefix: "/data"})
        server.register(imageEndpoint, {prefix: "/image"})
        server.register(ManagementApi, {prefix: "/api"})
    })
    afterEach(async () => {
        delete process.env.API_TOKEN
        ConfigManager.instance.client = fileClient
        client.close()
        await server.close()
    })

    it("records an unknown device as unconfigured and still answers 404 on /data", async () => {
        const response = await server.inject({method: "GET", url: "/data?devid=DEADBEEF0000&voltage=3900"})
        assert.equal(response.statusCode, 404)

        const device = await client.getDevice("DEADBEEF0000")
        assert.equal(device.room_id, null)
        assert.equal(device.battery_mv, 3900)
        assert.ok(device.last_contact)
        const samples = await client.getBatteryHistory("DEADBEEF0000", ...EVERYTHING)
        assert.deepEqual(samples.map(sample => sample.voltage_mv), [3900])
    })

    it("keeps one battery sample per 10 minutes", async () => {
        await server.inject({method: "GET", url: "/data?devid=DEADBEEF0000&voltage=3900"})
        await server.inject({method: "GET", url: "/image?devid=DEADBEEF0000&voltage=3890"})
        assert.equal((await client.getBatteryHistory("DEADBEEF0000", ...EVERYTHING)).length, 1)
        assert.equal((await client.getDevice("DEADBEEF0000")).battery_mv, 3890)
    })

    it("ignores requests that do not come from a RoomMate", async () => {
        for (const devid of ["", "../etc", "deadbeef", "deadbeef0000ff"]) {
            await server.inject({method: "GET", url: `/data?devid=${devid}&voltage=3900`})
        }
        await server.inject({method: "GET", url: "/data"})
        assert.deepEqual(await client.getDevices(), [])
    })

    it("stores the screen sent to the device and serves it to the UI", async () => {
        const missing = await server.inject({method: "GET", url: "/api/devices/deadbeef0000/screen.png", headers})
        assert.equal(missing.statusCode, 404)

        const image = await server.inject({method: "GET", url: "/image?devid=deadbeef0000&png=true"})
        assert.equal(image.statusCode, 200)
        assert.equal(image.headers["content-type"], "image/png")
        assert.deepEqual(image.rawPayload.subarray(0, 4), PNG_SIGNATURE)
        assert.deepEqual((await client.getScreen("deadbeef0000")).png, image.rawPayload)

        const screen = await server.inject({method: "GET", url: "/api/devices/deadbeef0000/screen.png", headers})
        assert.equal(screen.statusCode, 200)
        assert.equal(screen.headers["content-type"], "image/png")
        assert.deepEqual(screen.rawPayload, image.rawPayload)
    })

    it("sends the device a packed image", async () => {
        const image = await server.inject({method: "GET", url: "/image?devid=deadbeef0000&voltage=3900"})
        assert.equal(image.statusCode, 200)
        assert.equal(Buffer.from(image.body, "base64").length, 48000)
    })

    it("renders a preview without storing it or clearing a redraw request", async () => {
        await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString()})
        await client.setRedrawRequested("deadbeef0000", true)

        const preview = await server.inject({method: "GET", url: "/api/devices/deadbeef0000/preview.png", headers})
        assert.equal(preview.statusCode, 200)
        assert.equal(preview.headers["content-type"], "image/png")
        assert.deepEqual(preview.rawPayload.subarray(0, 4), PNG_SIGNATURE)
        assert.equal(await client.getScreen("deadbeef0000"), null)
        assert.equal((await client.getDevice("deadbeef0000")).redraw_requested, true)

        const unknown = await server.inject({method: "GET", url: "/api/devices/000000000000/preview.png", headers})
        assert.equal(unknown.statusCode, 404)
    })

    it("sets a redraw request that the next image clears", async () => {
        await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString()})
        const redraw = await server.inject({method: "POST", url: "/api/devices/deadbeef0000/redraw", headers, payload: {}})
        assert.equal(redraw.statusCode, 204)
        assert.equal((await client.getDevice("deadbeef0000")).redraw_requested, true)

        await server.inject({method: "GET", url: "/image?devid=deadbeef0000"})
        assert.equal((await client.getDevice("deadbeef0000")).redraw_requested, false)

        const unknown = await server.inject({method: "POST", url: "/api/devices/000000000000/redraw", headers, payload: {}})
        assert.equal(unknown.statusCode, 404)
    })

    it("returns the battery history of the requested days", async () => {
        await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString()})
        const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000).toISOString()
        await client.addBatterySample("deadbeef0000", 4100, daysAgo(40))
        await client.addBatterySample("deadbeef0000", 4000, daysAgo(20))
        await client.addBatterySample("deadbeef0000", 3900, daysAgo(1))

        const month = await server.inject({method: "GET", url: "/api/devices/deadbeef0000/battery", headers})
        assert.deepEqual(month.json().map(sample => sample.voltage_mv), [4000, 3900])
        const week = await server.inject({method: "GET", url: "/api/devices/deadbeef0000/battery?days=7", headers})
        assert.deepEqual(week.json().map(sample => sample.voltage_mv), [3900])
        const invalid = await server.inject({method: "GET", url: "/api/devices/deadbeef0000/battery?days=0", headers})
        assert.equal(invalid.statusCode, 400)
    })
})
