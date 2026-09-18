import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {SqliteDBClient} from "../src/db/SqliteDBClient";
import {importCalendarsJson} from "../src/db/importCalendarsJson";
import {migrations} from "../src/db/migrations";
import {IOrganization} from "../../datamodels/IOrganization";
import {IRoom} from "../../datamodels/IRoom";

const ORGANIZATION: IOrganization = {
    name: "Institute",
    external_identifier: "",
    soon_threshold_in_min: 15,
    night_start_hour: 19,
    night_end_hour: 8,
    timezone: "Europe/Berlin",
    low_battery_voltage_cutoff_in_mv: 3100,
    default_logo: "institute_logo.png",
}

const TENANT = {identifier: "main", endpoint: "https://mail.example.com/EWS/Exchange.asmx", user: "sign@example.com", secret: "EWS_SECRET"}

function icalRoom(id_string: string): IRoom {
    return {
        room_number: 100, id_string, name: `Room ${id_string}`, logo: "institute_logo.png",
        ews_info: undefined, ical_info: {endpoint: "https://calendar.example.com/room.ics"}, persons: undefined,
    }
}

describe("SqliteDBClient", () => {
    let client: SqliteDBClient

    beforeEach(() => {
        client = new SqliteDBClient(":memory:")
    })
    afterEach(() => client.close())

    it("applies every migration once", () => {
        assert.equal(client.db.pragma("user_version", {simple: true}), migrations.length)
    })

    it("stores the organization and defaults the offline threshold", async () => {
        assert.equal(await client.getOrganization(), undefined)
        assert.equal(await client.hasOrganization(), false)
        const saved = await client.setOrganization(ORGANIZATION)
        assert.deepEqual(saved, {...ORGANIZATION, device_offline_after_min: 120})
        await client.setOrganization({...ORGANIZATION, timezone: "UTC", device_offline_after_min: 30})
        assert.equal((await client.getOrganization()).timezone, "UTC")
        assert.equal((await client.getOrganization()).device_offline_after_min, 30)
    })

    it("creates, updates and deletes tenants", async () => {
        const tenant = await client.addEwsUser(TENANT)
        assert.deepEqual(tenant, {...TENANT, id: tenant.id})
        assert.deepEqual(await client.getEwsUsers(), [tenant])
        const updated = await client.updateEwsUser(tenant.id, {...TENANT, user: "other@example.com"})
        assert.equal(updated.user, "other@example.com")
        assert.equal(await client.updateEwsUser("999", TENANT), undefined)
        assert.equal(await client.deleteEwsUser(tenant.id), true)
        assert.equal(await client.getEwsUser(tenant.id), undefined)
    })

    it("refuses to delete a tenant a room uses", async () => {
        const tenant = await client.addEwsUser(TENANT)
        await client.addRoom({...icalRoom("200"), ical_info: undefined, ews_info: {email: "room@example.com", tenant_id: tenant.id}})
        await assert.rejects(client.deleteEwsUser(tenant.id), /FOREIGN KEY constraint failed/)
    })

    it("creates, updates and deletes rooms of every type", async () => {
        const tenant = await client.addEwsUser(TENANT)
        const ical = await client.addRoom(icalRoom("100"))
        const ews = await client.addRoom({...icalRoom("200"), ical_info: undefined, ews_info: {email: "room@example.com", tenant_id: tenant.id}})
        const office = await client.addRoom({
            ...icalRoom("300"), room_number: null, ical_info: undefined,
            persons: [{name: "A", job: "B", group: "C", phone: undefined, email: "a@example.com", ews_info: {email: "a@example.com", tenant_id: tenant.id}}],
        })

        assert.deepEqual(ical, {...icalRoom("100"), id: ical.id})
        assert.deepEqual(ews.ews_info, {email: "room@example.com", tenant_id: tenant.id})
        assert.equal(ews.ical_info, undefined)
        assert.equal(office.room_number, null)
        assert.equal(office.persons[0].ews_info.tenant_id, tenant.id)
        assert.equal((await client.getRooms()).length, 3)

        const updated = await client.updateRoom(ical.id, {...icalRoom("101"), name: "Renamed"})
        assert.equal(updated.name, "Renamed")
        assert.equal(updated.id_string, "101")
        assert.equal(await client.updateRoom("999", icalRoom("x")), undefined)

        assert.equal(await client.deleteRoom(ical.id), true)
        assert.equal(await client.getRoom(ical.id), undefined)
    })

    it("creates, updates and deletes devices", async () => {
        const room = await client.addRoom(icalRoom("100"))
        const device = await client.addDevice({device_id: "aabbccddeeff", location: "Door", room_id: room.id, last_contact: null, battery_mv: null})
        assert.deepEqual(device, {
            id: device.id, device_id: "aabbccddeeff", location: "Door", room_id: room.id,
            last_contact: null, battery_mv: null, next_expected_contact: null, redraw_requested: false,
        })
        assert.deepEqual(await client.getRoomForDevice("aabbccddeeff"), room)
        assert.deepEqual(await client.getDeviceFromHardwareID("aabbccddeeff"), device)

        const moved = await client.updateDevice("aabbccddeeff", {...device, location: "Window", room_id: null})
        assert.equal(moved.location, "Window")
        assert.equal(moved.room_id, null)
        assert.equal(await client.getRoomForDevice("aabbccddeeff"), null)

        await client.setRedrawRequested("aabbccddeeff", true)
        assert.equal((await client.getDevice("aabbccddeeff")).redraw_requested, true)

        assert.equal(await client.deleteDevice("aabbccddeeff"), true)
        assert.deepEqual(await client.getDevices(), [])
    })

    it("records an unknown device as unconfigured and keeps telemetry it was not sent", async () => {
        const first = await client.touchDevice("deadbeef0000", {last_contact: "2026-09-18T10:00:00.000Z", battery_mv: 3900, next_expected_contact: "2026-09-18T12:00:00.000Z"})
        assert.equal(first.room_id, null)
        assert.equal(first.location, "")
        assert.equal(first.battery_mv, 3900)

        const second = await client.touchDevice("deadbeef0000", {last_contact: "2026-09-18T11:00:00.000Z"})
        assert.equal(second.last_contact, "2026-09-18T11:00:00.000Z")
        assert.equal(second.battery_mv, 3900)
        assert.equal(second.next_expected_contact, "2026-09-18T12:00:00.000Z")
        assert.equal((await client.getDevices()).length, 1)
    })

    it("unassigns devices when their room is deleted", async () => {
        const room = await client.addRoom(icalRoom("100"))
        await client.addDevice({device_id: "aabbccddeeff", location: "", room_id: room.id, last_contact: null, battery_mv: null})
        await client.deleteRoom(room.id)
        assert.equal((await client.getDevice("aabbccddeeff")).room_id, null)
    })

    it("joins devices with their rooms", async () => {
        const room = await client.addRoom(icalRoom("100"))
        await client.addDevice({device_id: "aaaaaaaaaaaa", location: "", room_id: room.id, last_contact: null, battery_mv: null})
        await client.touchDevice("bbbbbbbbbbbb", {last_contact: "2026-09-18T10:00:00.000Z"})
        const devices = await client.getDevicesWithRooms()
        assert.deepEqual(devices.map(device => [device.device_id, device.room_id, device.room]), [["aaaaaaaaaaaa", room.id, room], ["bbbbbbbbbbbb", null, null]])
    })

    it("stores, queries and prunes battery samples", async () => {
        await client.touchDevice("aabbccddeeff", {last_contact: "2026-09-18T10:00:00.000Z"})
        await client.addBatterySample("aabbccddeeff", 4000, "2026-09-01T10:00:00.000Z")
        await client.addBatterySample("aabbccddeeff", 3900, "2026-09-10T10:00:00.000Z")
        await client.addBatterySample("aabbccddeeff", 3800, "2026-09-18T10:00:00.000Z")

        const history = await client.getBatteryHistory("aabbccddeeff", "2026-09-05T00:00:00.000Z", "2026-09-18T10:00:00.000Z")
        assert.deepEqual(history.map(sample => sample.voltage_mv), [3900, 3800])

        assert.equal(await client.pruneBatterySamples("2026-09-10T10:00:00.000Z"), 1)
        assert.equal((await client.getBatteryHistory("aabbccddeeff", "2000-01-01", "2100-01-01")).length, 2)

        await client.deleteDevice("aabbccddeeff")
        assert.equal((await client.getBatteryHistory("aabbccddeeff", "2000-01-01", "2100-01-01")).length, 0)
    })

    it("keeps the last screen per device", async () => {
        await client.touchDevice("aabbccddeeff", {last_contact: "2026-09-18T10:00:00.000Z"})
        assert.equal(await client.getScreen("aabbccddeeff"), null)
        await client.saveScreen("aabbccddeeff", Buffer.from("first"), "hash1")
        await client.saveScreen("aabbccddeeff", Buffer.from("second"), "hash2")
        const screen = await client.getScreen("aabbccddeeff")
        assert.equal(screen.png.toString(), "second")
        assert.equal(screen.hash, "hash2")
    })
})

describe("importCalendarsJson", () => {
    let client: SqliteDBClient

    beforeEach(() => {
        client = new SqliteDBClient(":memory:")
    })
    afterEach(() => client.close())

    it("imports the deployment example", async () => {
        const calendars = JSON.parse(fs.readFileSync("deployment_example/config/calendars.json", "utf8"))
        const summary = await importCalendarsJson(client, calendars)
        assert.deepEqual(summary, {organization: 1, tenants: 1, rooms: 3, devices: 3})

        const [tenant] = await client.getEwsUsers()
        assert.equal(tenant.identifier, "1")
        const ewsRoom = await client.getRoomForDevice("aaaaaaaaaaaa")
        assert.equal(ewsRoom.ews_info.tenant_id, tenant.id)
        const office = await client.getRoomForDevice("cccccccccccc")
        assert.equal(office.room_number, calendars.devices[2].room_id.room_number)
        assert.equal(office.persons[0].ews_info.tenant_id, tenant.id)
        assert.equal((await client.getOrganization()).default_logo, "institute_logo.png")
    })

    it("stores a room shared by several devices once", async () => {
        const room = icalRoom("100")
        await importCalendarsJson(client, {
            global_config: ORGANIZATION,
            devices: [
                {device_id: "aaaaaaaaaaaa", location: "Left", room_id: room},
                {device_id: "bbbbbbbbbbbb", location: "Right", room_id: room},
            ],
        })
        assert.equal((await client.getRooms()).length, 1)
        const devices = await client.getDevices()
        assert.equal(devices[0].room_id, devices[1].room_id)
    })

    it("imports nothing when a room references an unknown tenant", async () => {
        const calendars = {
            global_config: ORGANIZATION,
            devices: [{device_id: "aaaaaaaaaaaa", location: "", room_id: {...icalRoom("100"), ical_info: undefined, ews_info: {email: "x", tenant_id: "missing"}}}],
        }
        await assert.rejects(importCalendarsJson(client, calendars), /Unknown tenant "missing"/)
        assert.equal(await client.hasOrganization(), false)
        assert.deepEqual(await client.getRooms(), [])
    })

    it("refuses to import into a configured database", async () => {
        await client.setOrganization(ORGANIZATION)
        await assert.rejects(importCalendarsJson(client, {global_config: ORGANIZATION}), /already contains/)
    })
})
