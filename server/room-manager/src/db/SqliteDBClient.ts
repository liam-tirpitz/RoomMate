import Database from "better-sqlite3";
import {IDBClient, IDeviceTelemetry, IScreen} from "./IDBClient";
import {migrate} from "./migrations";
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IDevice} from "../../../datamodels/IDevice";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IRoom, isRoom} from "../../../datamodels/IRoom";
import {IPerson} from "../../../datamodels/IPerson";
import {IBatterySample} from "../../../datamodels/IBatterySample";

const DEFAULT_OFFLINE_AFTER_MIN = 120

interface RoomRow {
    id: number
    room_number: number | null
    id_string: string
    name: string
    logo: string
    ews_email: string | null
    ews_tenant_id: number | null
    ical_endpoint: string | null
    persons_json: string | null
}

interface DeviceRow {
    id: number
    device_id: string
    location: string
    room_id: number | null
    last_contact: string | null
    battery_mv: number | null
    next_expected_contact: string | null
    redraw_requested: number
}

interface TenantRow {
    id: number
    identifier: string
    endpoint: string
    user: string
    secret_env: string
}

// Room and device columns prefixed for the joined queries
const ROOM_COLUMNS = ["id", "room_number", "id_string", "name", "logo", "ews_email", "ews_tenant_id", "ical_endpoint", "persons_json"]
const JOINED_ROOM_COLUMNS = ROOM_COLUMNS.map(column => `r.${column} AS room_${column}`).join(", ")

export class SqliteDBClient implements IDBClient {
    readonly db: Database.Database

    // path is a file name or ":memory:"; migrations run before the constructor returns
    constructor(path: string) {
        this.db = new Database(path)
        if (path != ":memory:") {
            this.db.pragma("journal_mode = WAL")
        }
        this.db.pragma("foreign_keys = ON")
        migrate(this.db)
    }

    close() {
        this.db.close()
    }

    // better-sqlite3 is synchronous, so nothing else runs on this connection between BEGIN and COMMIT
    // as long as fn only awaits this client
    async transaction<T>(fn: () => Promise<T>): Promise<T> {
        this.db.exec("BEGIN")
        try {
            const result = await fn()
            this.db.exec("COMMIT")
            return result
        } catch (error) {
            this.db.exec("ROLLBACK")
            throw error
        }
    }

    // Organization

    async hasOrganization(): Promise<boolean> {
        return !!this.db.prepare("SELECT 1 FROM organization WHERE id = 1").get()
    }

    async getOrganization(): Promise<IOrganization> {
        const row = this.db.prepare("SELECT * FROM organization WHERE id = 1").get() as any
        if (!row) return undefined
        delete row.id
        return row
    }

    async setOrganization(org: IOrganization): Promise<IOrganization> {
        this.db.prepare(`
            INSERT OR REPLACE INTO organization (id, name, external_identifier, soon_threshold_in_min, night_start_hour,
                night_end_hour, timezone, low_battery_voltage_cutoff_in_mv, default_logo, device_offline_after_min)
            VALUES (1, @name, @external_identifier, @soon_threshold_in_min, @night_start_hour,
                @night_end_hour, @timezone, @low_battery_voltage_cutoff_in_mv, @default_logo, @device_offline_after_min)
        `).run({
            name: org.name ?? "",
            external_identifier: org.external_identifier ?? "",
            soon_threshold_in_min: org.soon_threshold_in_min,
            night_start_hour: org.night_start_hour,
            night_end_hour: org.night_end_hour,
            timezone: org.timezone,
            low_battery_voltage_cutoff_in_mv: org.low_battery_voltage_cutoff_in_mv,
            default_logo: org.default_logo,
            device_offline_after_min: org.device_offline_after_min ?? DEFAULT_OFFLINE_AFTER_MIN,
        })
        return this.getOrganization()
    }

    // Tenants

    async getEwsUsers(): Promise<IEWSTenant[]> {
        const rows = this.db.prepare("SELECT * FROM tenants ORDER BY identifier").all() as TenantRow[]
        return rows.map(toTenant)
    }

    async getEwsUser(id: string): Promise<IEWSTenant> {
        const row = this.db.prepare("SELECT * FROM tenants WHERE id = ?").get(Number(id)) as TenantRow
        return row ? toTenant(row) : undefined
    }

    async addEwsUser(user: IEWSTenant): Promise<IEWSTenant> {
        const result = this.db.prepare("INSERT INTO tenants (identifier, endpoint, user, secret_env) VALUES (?, ?, ?, ?)")
            .run(String(user.identifier), user.endpoint, user.user, user.secret)
        return this.getEwsUser(String(result.lastInsertRowid))
    }

    async updateEwsUser(id: string, user: IEWSTenant): Promise<IEWSTenant> {
        const result = this.db.prepare("UPDATE tenants SET identifier = ?, endpoint = ?, user = ?, secret_env = ? WHERE id = ?")
            .run(String(user.identifier), user.endpoint, user.user, user.secret, Number(id))
        return result.changes ? this.getEwsUser(id) : undefined
    }

    // Throws "FOREIGN KEY constraint failed" while a room uses the tenant. References from persons are not checked here.
    async deleteEwsUser(id: string): Promise<boolean> {
        return this.db.prepare("DELETE FROM tenants WHERE id = ?").run(Number(id)).changes > 0
    }

    // Rooms

    async getRooms(): Promise<IRoom[]> {
        const rows = this.db.prepare("SELECT * FROM rooms ORDER BY id_string").all() as RoomRow[]
        return rows.map(toRoom)
    }

    async getRoom(id: string): Promise<IRoom> {
        const row = this.db.prepare("SELECT * FROM rooms WHERE id = ?").get(Number(id)) as RoomRow
        return row ? toRoom(row) : undefined
    }

    async addRoom(room: IRoom): Promise<IRoom> {
        const result = this.db.prepare(`
            INSERT INTO rooms (room_number, id_string, name, logo, ews_email, ews_tenant_id, ical_endpoint, persons_json)
            VALUES (@room_number, @id_string, @name, @logo, @ews_email, @ews_tenant_id, @ical_endpoint, @persons_json)
        `).run(fromRoom(room))
        return this.getRoom(String(result.lastInsertRowid))
    }

    async updateRoom(id: string, room: IRoom): Promise<IRoom> {
        const result = this.db.prepare(`
            UPDATE rooms SET room_number = @room_number, id_string = @id_string, name = @name, logo = @logo,
                ews_email = @ews_email, ews_tenant_id = @ews_tenant_id, ical_endpoint = @ical_endpoint, persons_json = @persons_json
            WHERE id = @id
        `).run({...fromRoom(room), id: Number(id)})
        return result.changes ? this.getRoom(id) : undefined
    }

    // Devices showing the room become unconfigured (ON DELETE SET NULL)
    async deleteRoom(id: string): Promise<boolean> {
        return this.db.prepare("DELETE FROM rooms WHERE id = ?").run(Number(id)).changes > 0
    }

    // Devices

    async getDevices(): Promise<IDevice[]> {
        const rows = this.db.prepare("SELECT * FROM devices ORDER BY device_id").all() as DeviceRow[]
        return rows.map(toDevice)
    }

    async getDevice(device_id: string): Promise<IDevice> {
        const row = this.db.prepare("SELECT * FROM devices WHERE device_id = ?").get(device_id) as DeviceRow
        return row ? toDevice(row) : undefined
    }

    async getDeviceFromHardwareID(id: string): Promise<IDevice> {
        return this.getDevice(id)
    }

    async getRoomForDevice(device_id: string): Promise<IRoom | null> {
        const row = this.db.prepare("SELECT r.* FROM devices d JOIN rooms r ON r.id = d.room_id WHERE d.device_id = ?")
            .get(device_id) as RoomRow
        return row ? toRoom(row) : null
    }

    async getDevicesWithRooms(): Promise<Array<IDevice & {room: IRoom | null}>> {
        const rows = this.db.prepare(`
            SELECT d.*, ${JOINED_ROOM_COLUMNS} FROM devices d LEFT JOIN rooms r ON r.id = d.room_id ORDER BY d.device_id
        `).all() as any[]
        return rows.map(row => {
            const room: any = {}
            for (const column of ROOM_COLUMNS) {
                room[column] = row[`room_${column}`]
                delete row[`room_${column}`]
            }
            return {...toDevice(row), room: room.id == null ? null : toRoom(room)}
        })
    }

    async addDevice(device: IDevice): Promise<IDevice> {
        this.db.prepare("INSERT INTO devices (device_id, location, room_id) VALUES (?, ?, ?)")
            .run(device.device_id, device.location ?? "", roomReference(device.room_id))
        return this.getDevice(device.device_id)
    }

    // Only the configuration (location, room) is changed; telemetry goes through touchDevice
    async updateDevice(device_id: string, device: IDevice): Promise<IDevice> {
        const result = this.db.prepare("UPDATE devices SET location = ?, room_id = ? WHERE device_id = ?")
            .run(device.location ?? "", roomReference(device.room_id), device_id)
        return result.changes ? this.getDevice(device_id) : undefined
    }

    async deleteDevice(device_id: string): Promise<boolean> {
        return this.db.prepare("DELETE FROM devices WHERE device_id = ?").run(device_id).changes > 0
    }

    async touchDevice(device_id: string, telemetry: IDeviceTelemetry): Promise<IDevice> {
        this.db.prepare(`
            INSERT INTO devices (device_id, last_contact, battery_mv, next_expected_contact)
            VALUES (@device_id, @last_contact, @battery_mv, @next_expected_contact)
            ON CONFLICT (device_id) DO UPDATE SET
                last_contact = excluded.last_contact,
                battery_mv = COALESCE(excluded.battery_mv, battery_mv),
                next_expected_contact = COALESCE(excluded.next_expected_contact, next_expected_contact)
        `).run({
            device_id,
            last_contact: telemetry.last_contact,
            battery_mv: telemetry.battery_mv ?? null,
            next_expected_contact: telemetry.next_expected_contact ?? null,
        })
        return this.getDevice(device_id)
    }

    async setRedrawRequested(device_id: string, flag: boolean): Promise<void> {
        this.db.prepare("UPDATE devices SET redraw_requested = ? WHERE device_id = ?").run(flag ? 1 : 0, device_id)
    }

    // Battery history

    async addBatterySample(device_id: string, voltage_mv: number, ts: string): Promise<void> {
        this.db.prepare("INSERT INTO battery_samples (device_id, ts, voltage_mv) VALUES (?, ?, ?)").run(device_id, ts, voltage_mv)
    }

    async getBatteryHistory(device_id: string, from: string, to: string): Promise<IBatterySample[]> {
        return this.db.prepare(`
            SELECT device_id, ts, voltage_mv FROM battery_samples WHERE device_id = ? AND ts >= ? AND ts <= ? ORDER BY ts
        `).all(device_id, from, to) as IBatterySample[]
    }

    async pruneBatterySamples(olderThan: string): Promise<number> {
        return this.db.prepare("DELETE FROM battery_samples WHERE ts < ?").run(olderThan).changes
    }

    // Screens

    async saveScreen(device_id: string, png: Buffer, hash: string | null): Promise<void> {
        this.db.prepare("INSERT OR REPLACE INTO screens (device_id, png, rendered_at, hash) VALUES (?, ?, ?, ?)")
            .run(device_id, png, new Date().toISOString(), hash)
    }

    async getScreen(device_id: string): Promise<IScreen | null> {
        const row = this.db.prepare("SELECT png, rendered_at, hash FROM screens WHERE device_id = ?").get(device_id) as IScreen
        return row ?? null
    }
}

function toTenant(row: TenantRow): IEWSTenant {
    return {id: String(row.id), identifier: row.identifier, endpoint: row.endpoint, user: row.user, secret: row.secret_env}
}

function toRoom(row: RoomRow): IRoom {
    return {
        id: String(row.id),
        room_number: row.room_number,
        id_string: row.id_string,
        name: row.name,
        logo: row.logo,
        ews_info: row.ews_email != null ? {email: row.ews_email, tenant_id: String(row.ews_tenant_id)} : undefined,
        ical_info: row.ical_endpoint != null ? {endpoint: row.ical_endpoint} : undefined,
        persons: row.persons_json != null ? JSON.parse(row.persons_json) : undefined,
    }
}

function fromRoom(room: IRoom) {
    const persons = room.persons?.map((person: IPerson) => ({
        ...person,
        ews_info: person.ews_info ? {...person.ews_info, tenant_id: String(person.ews_info.tenant_id)} : person.ews_info,
    }))
    return {
        room_number: room.room_number ?? null,
        id_string: room.id_string,
        name: room.name,
        logo: room.logo,
        ews_email: room.ews_info?.email ?? null,
        ews_tenant_id: room.ews_info ? Number(room.ews_info.tenant_id) : null,
        ical_endpoint: room.ical_info?.endpoint ?? null,
        persons_json: persons ? JSON.stringify(persons) : null,
    }
}

function toDevice(row: DeviceRow): IDevice {
    return {
        id: String(row.id),
        device_id: row.device_id,
        location: row.location,
        room_id: row.room_id == null ? null : String(row.room_id),
        last_contact: row.last_contact,
        battery_mv: row.battery_mv,
        next_expected_contact: row.next_expected_contact,
        redraw_requested: !!row.redraw_requested,
    }
}

function roomReference(room: string | IRoom | null | undefined): number | null {
    if (room == null || room === "") return null
    return Number(isRoom(room) ? room.id : room)
}
