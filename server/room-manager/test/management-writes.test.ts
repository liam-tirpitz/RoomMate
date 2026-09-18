import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import fastify, {FastifyInstance} from "fastify";
import {createCanvas} from "canvas";
import {ManagementApi} from "../src/routes/management-api";
import {ConfigManager} from "../src/ConfigManager";
import {IDBClient} from "../src/db/IDBClient";
import {SqliteDBClient} from "../src/db/SqliteDBClient";
import {setLogoDir} from "../src/logos";
import {ICalClient} from "../src/calendar-apis/ical";

const TOKEN = "test-token"
const headers = {authorization: `Bearer ${TOKEN}`}
const LOGO = "institute_logo.png"
const ORGANIZATION = {
    name: "Institute", external_identifier: "", soon_threshold_in_min: 15, night_start_hour: 19, night_end_hour: 8,
    timezone: "Europe/Berlin", low_battery_voltage_cutoff_in_mv: 3100, default_logo: LOGO, device_offline_after_min: 120,
}
const TENANT = {identifier: "main", endpoint: "https://mail.example.com/EWS/Exchange.asmx", user: "sign@example.com", secret: "ROOMMATE_TEST_SECRET"}
const ICAL_ROOM = {room_number: 100, id_string: "100", name: "Meeting room", logo: LOGO, ical_info: {endpoint: "https://calendar.example.com/room.ics"}}

function person(name: string, tenant_id: string) {
    return {name, job: "Researcher", group: "Group", email: `${name}@example.com`, phone: null, ews_info: {email: `${name}@example.com`, tenant_id}}
}

function png(width: number, height: number): Buffer {
    return createCanvas(width, height).toBuffer("image/png")
}

// inject has no form-data support, so build the body by hand
function multipart(filename: string, data: Buffer, contentType = "application/octet-stream") {
    const boundary = "----roommate-test"
    const payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
        data,
        Buffer.from(`\r\n--${boundary}--\r\n`),
    ])
    return {payload, headers: {...headers, "content-type": `multipart/form-data; boundary=${boundary}`}}
}

describe("management API writes on the SQLite backend", () => {
    let server: FastifyInstance
    let fileClient: IDBClient
    let client: SqliteDBClient
    let logoDir: string
    const timezone = process.env.TZ

    beforeEach(async () => {
        process.env.API_TOKEN = TOKEN
        fileClient = ConfigManager.instance.client
        client = new SqliteDBClient(":memory:")
        ConfigManager.instance.client = client
        await client.setOrganization(ORGANIZATION)
        logoDir = fs.mkdtempSync(path.join(os.tmpdir(), "roommate-logos-"))
        fs.copyFileSync(path.join("deployment_example/config", LOGO), path.join(logoDir, LOGO))
        setLogoDir(logoDir)
        server = fastify()
        server.register(ManagementApi, {prefix: "/api"})
    })
    afterEach(async () => {
        delete process.env.API_TOKEN
        delete process.env[TENANT.secret]
        process.env.TZ = timezone
        ConfigManager.instance.client = fileClient
        setLogoDir("config")
        fs.rmSync(logoDir, {recursive: true, force: true})
        client.close()
        await server.close()
    })

    const inject = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
        server.inject({method, url, headers, payload})

    async function addTenant(): Promise<string> {
        return (await client.addEwsUser(TENANT)).id
    }

    describe("rooms", () => {
        it("creates a room and drops unknown properties", async () => {
            const response = await inject("POST", "/api/rooms", {...ICAL_ROOM, id: "42", color: "red"})
            assert.equal(response.statusCode, 201)
            const room = response.json()
            assert.notEqual(room.id, "42")
            assert.equal(room.color, undefined)
            assert.deepEqual(JSON.parse(JSON.stringify(await client.getRoom(room.id))), room)
        })

        it("needs exactly one calendar source", async () => {
            const tenant_id = await addTenant()
            const both = await inject("POST", "/api/rooms", {...ICAL_ROOM, ews_info: {email: "room@example.com", tenant_id}})
            assert.equal(both.statusCode, 400)
            assert.match(both.json().message ?? both.json().error, /exactly one/)
            const none = await inject("POST", "/api/rooms", {...ICAL_ROOM, ical_info: null})
            assert.equal(none.statusCode, 400)
            const nulls = await inject("POST", "/api/rooms", {...ICAL_ROOM, ews_info: null, persons: null})
            assert.equal(nulls.statusCode, 201)
        })

        it("allows at most two persons in an office", async () => {
            const tenant_id = await addTenant()
            const office = {...ICAL_ROOM, room_number: null, ical_info: undefined}
            const two = await inject("POST", "/api/rooms", {...office, persons: [person("a", tenant_id), person("b", tenant_id)]})
            assert.equal(two.statusCode, 201)
            assert.equal(two.json().persons.length, 2)
            const three = await inject("POST", "/api/rooms", {...office, persons: [person("a", tenant_id), person("b", tenant_id), person("c", tenant_id)]})
            assert.equal(three.statusCode, 400)
        })

        it("rejects unknown tenants and logos", async () => {
            const tenant = await inject("POST", "/api/rooms", {...ICAL_ROOM, ical_info: undefined, ews_info: {email: "room@example.com", tenant_id: "99"}})
            assert.equal(tenant.statusCode, 400)
            const inPerson = await inject("POST", "/api/rooms", {...ICAL_ROOM, ical_info: undefined, persons: [person("a", "99")]})
            assert.equal(inPerson.statusCode, 400)
            const logo = await inject("POST", "/api/rooms", {...ICAL_ROOM, logo: "missing.png"})
            assert.equal(logo.statusCode, 400)
        })

        it("updates and deletes rooms and answers 404 for unknown ones", async () => {
            const room = (await inject("POST", "/api/rooms", ICAL_ROOM)).json()
            await client.addDevice({device_id: "aabbccddeeff", location: "", room_id: room.id, last_contact: null, battery_mv: null})

            const updated = await inject("PUT", `/api/rooms/${room.id}`, {...ICAL_ROOM, name: "Renamed"})
            assert.equal(updated.statusCode, 200)
            assert.equal(updated.json().name, "Renamed")
            assert.equal((await inject("PUT", "/api/rooms/999", ICAL_ROOM)).statusCode, 404)

            assert.equal((await inject("DELETE", `/api/rooms/${room.id}`)).statusCode, 204)
            assert.equal((await client.getDevice("aabbccddeeff")).room_id, null)
            assert.equal((await inject("DELETE", `/api/rooms/${room.id}`)).statusCode, 404)
        })

        it("renders a room preview", async () => {
            const room = (await inject("POST", "/api/rooms", ICAL_ROOM)).json()
            const getCalendar = ICalClient.prototype.getCalendar
            ICalClient.prototype.getCalendar = async () => ({})
            try {
                const preview = await inject("GET", `/api/rooms/${room.id}/preview.png`)
                assert.equal(preview.statusCode, 200)
                assert.equal(preview.headers["content-type"], "image/png")
            } finally {
                ICalClient.prototype.getCalendar = getCalendar
            }
            assert.equal((await inject("GET", "/api/rooms/999/preview.png")).statusCode, 404)
        })
    })

    describe("devices", () => {
        it("registers a device ahead of time and refuses duplicates and bad MACs", async () => {
            const created = await inject("POST", "/api/devices", {device_id: "AABBCCDDEEFF", location: "Door"})
            assert.equal(created.statusCode, 201)
            assert.equal(created.json().room_id, null)
            assert.equal((await inject("POST", "/api/devices", {device_id: "AABBCCDDEEFF"})).statusCode, 409)
            assert.equal((await inject("POST", "/api/devices", {device_id: "AA:BB:CC:DD:EE:FF"})).statusCode, 400)
            assert.equal((await inject("POST", "/api/devices", {device_id: "112233445566", room_id: "999"})).statusCode, 400)
        })

        it("assigns a room and changes nothing but location and room", async () => {
            const room = await client.addRoom({...ICAL_ROOM, ews_info: undefined, persons: undefined})
            await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString(), battery_mv: 3900})

            const response = await inject("PUT", "/api/devices/deadbeef0000", {location: "Window", room_id: room.id, battery_mv: 1, device_id: "other"})
            assert.equal(response.statusCode, 200)
            const device = response.json()
            assert.equal(device.status, "ok")
            assert.deepEqual(device.room, {id: room.id, name: ICAL_ROOM.name, id_string: ICAL_ROOM.id_string})
            assert.equal(device.battery_mv, 3900)
            assert.equal(device.device_id, "deadbeef0000")

            assert.equal((await inject("PUT", "/api/devices/deadbeef0000", {location: "", room_id: "999"})).statusCode, 400)
            assert.equal((await inject("PUT", "/api/devices/000000000000", {location: "", room_id: null})).statusCode, 404)
            assert.equal((await inject("PUT", "/api/devices/deadbeef0000", {location: ""})).statusCode, 400)
        })

        it("deletes devices", async () => {
            await client.touchDevice("deadbeef0000", {last_contact: new Date().toISOString()})
            assert.equal((await inject("DELETE", "/api/devices/deadbeef0000")).statusCode, 204)
            assert.equal((await inject("DELETE", "/api/devices/deadbeef0000")).statusCode, 404)
        })
    })

    describe("tenants", () => {
        it("reports whether the secret is available without returning it", async () => {
            const created = await inject("POST", "/api/tenants", TENANT)
            assert.equal(created.statusCode, 201)
            assert.equal(created.json().secret, TENANT.secret)
            assert.equal(created.json().secret_available, false)

            process.env[TENANT.secret] = "hunter2"
            const [tenant] = (await inject("GET", "/api/tenants")).json()
            assert.equal(tenant.secret_available, true)
            assert.doesNotMatch(JSON.stringify(tenant), /hunter2/)
        })

        it("validates tenants and refuses duplicate identifiers", async () => {
            assert.equal((await inject("POST", "/api/tenants", {...TENANT, secret: "my password"})).statusCode, 400)
            assert.equal((await inject("POST", "/api/tenants", {...TENANT, endpoint: "mail.example.com"})).statusCode, 400)
            const first = (await inject("POST", "/api/tenants", TENANT)).json()
            assert.equal((await inject("POST", "/api/tenants", TENANT)).statusCode, 409)
            const second = (await inject("POST", "/api/tenants", {...TENANT, identifier: "second"})).json()
            assert.equal((await inject("PUT", `/api/tenants/${second.id}`, TENANT)).statusCode, 409)
            assert.equal((await inject("PUT", `/api/tenants/${first.id}`, {...TENANT, user: "other@example.com"})).json().user, "other@example.com")
            assert.equal((await inject("PUT", "/api/tenants/999", TENANT)).statusCode, 404)
        })

        it("refuses to delete a tenant a room or a person uses", async () => {
            const tenant_id = await addTenant()
            const room = await client.addRoom({...ICAL_ROOM, ical_info: undefined, persons: undefined, ews_info: {email: "room@example.com", tenant_id}})
            const office = await client.addRoom({...ICAL_ROOM, name: "Office", ical_info: undefined, ews_info: undefined, persons: [person("a", tenant_id)] as any})

            const conflict = await inject("DELETE", `/api/tenants/${tenant_id}`)
            assert.equal(conflict.statusCode, 409)
            assert.match(conflict.json().message ?? conflict.json().error, /Meeting room, Office/)

            await client.deleteRoom(room.id)
            assert.equal((await inject("DELETE", `/api/tenants/${tenant_id}`)).statusCode, 409)
            await client.deleteRoom(office.id)
            assert.equal((await inject("DELETE", `/api/tenants/${tenant_id}`)).statusCode, 204)
            assert.equal((await inject("DELETE", `/api/tenants/${tenant_id}`)).statusCode, 404)
        })

        it("reports a failed connection test", async () => {
            const tenant_id = await addTenant()
            const response = await inject("POST", `/api/tenants/${tenant_id}/test`, {})
            assert.equal(response.statusCode, 200)
            assert.deepEqual(response.json(), {ok: false, error: "Missing Exchange Credentials!"})
        })
    })

    describe("organization", () => {
        it("replaces the organization and applies the timezone", async () => {
            const response = await inject("PUT", "/api/organization", {...ORGANIZATION, timezone: "America/New_York", device_offline_after_min: undefined})
            assert.equal(response.statusCode, 200)
            assert.equal(response.json().timezone, "America/New_York")
            assert.equal(response.json().device_offline_after_min, 120)
            assert.equal(process.env.TZ, "America/New_York")
        })

        it("rejects invalid settings", async () => {
            assert.equal((await inject("PUT", "/api/organization", {...ORGANIZATION, timezone: "Mars/Olympus"})).statusCode, 400)
            assert.equal((await inject("PUT", "/api/organization", {...ORGANIZATION, default_logo: "missing.png"})).statusCode, 400)
            assert.equal((await inject("PUT", "/api/organization", {...ORGANIZATION, night_start_hour: 24})).statusCode, 400)
            assert.equal((await inject("PUT", "/api/organization", {...ORGANIZATION, timezone: undefined})).statusCode, 400)
            assert.equal((await client.getOrganization()).timezone, ORGANIZATION.timezone)
        })
    })

    describe("logos", () => {
        it("lists logos with their size", async () => {
            const logos = (await inject("GET", "/api/logos")).json()
            assert.deepEqual(logos, [{name: LOGO, width: 229, height: 85, warnings: []}])
            const file = await inject("GET", `/api/logos/${LOGO}`)
            assert.equal(file.headers["content-type"], "image/png")
            assert.equal((await inject("GET", "/api/logos/missing.png")).statusCode, 404)
            assert.equal((await inject("GET", "/api/logos/..%2Fcalendars.json")).statusCode, 404)
        })

        it("uploads a logo under a safe name and warns when it is too large", async () => {
            const upload = multipart("../My Logo!.PNG", png(300, 120), "image/png")
            const response = await server.inject({method: "POST", url: "/api/logos", ...upload})
            assert.equal(response.statusCode, 201)
            const logo = response.json()
            assert.equal(logo.name, "my-logo.png")
            assert.equal(logo.warnings.length, 2)
            assert.ok(fs.existsSync(path.join(logoDir, "my-logo.png")))

            assert.equal((await server.inject({method: "POST", url: "/api/logos", ...upload})).statusCode, 409)
            assert.equal((await server.inject({method: "POST", url: "/api/logos?overwrite=true", ...upload})).statusCode, 201)
        })

        it("accepts only PNG and JPEG content", async () => {
            const text = multipart("logo.png", Buffer.from("not an image"), "image/png")
            assert.equal((await server.inject({method: "POST", url: "/api/logos", ...text})).statusCode, 415)
            const txt = multipart("notes.txt", Buffer.from("hello"), "text/plain")
            assert.equal((await server.inject({method: "POST", url: "/api/logos", ...txt})).statusCode, 415)
            assert.equal(fs.readdirSync(logoDir).length, 1)
        })

        it("refuses uploads over 1 MB", async () => {
            const large = multipart("large.png", Buffer.concat([png(10, 10), Buffer.alloc(1024 * 1024)]), "image/png")
            assert.equal((await server.inject({method: "POST", url: "/api/logos", ...large})).statusCode, 413)
        })

        it("deletes a logo only when nothing uses it", async () => {
            const upload = multipart("room.png", png(100, 50), "image/png")
            await server.inject({method: "POST", url: "/api/logos", ...upload})
            const room = await client.addRoom({...ICAL_ROOM, logo: "room.png", ews_info: undefined, persons: undefined})

            const inUse = await inject("DELETE", "/api/logos/room.png")
            assert.equal(inUse.statusCode, 409)
            assert.match(inUse.json().message ?? inUse.json().error, /Meeting room/)
            const defaultLogo = await inject("DELETE", `/api/logos/${LOGO}`)
            assert.equal(defaultLogo.statusCode, 409)

            await client.deleteRoom(room.id)
            assert.equal((await inject("DELETE", "/api/logos/room.png")).statusCode, 204)
            assert.equal((await inject("DELETE", "/api/logos/room.png")).statusCode, 404)
        })
    })
})
