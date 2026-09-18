import fs from "fs";
import {SqliteDBClient} from "./SqliteDBClient";
import {IRoom, isRoom} from "../../../datamodels/IRoom";
import {IEWSCalendarInfo} from "../../../datamodels/IEWSCalendarInfo";
import {Logging} from "../logging";

export const CALENDARS_JSON_PATH = "config/calendars.json"

export interface ImportSummary {
    organization: number
    tenants: number
    rooms: number
    devices: number
}

// Copies the file backend's configuration into an empty SQLite database, all or nothing.
// calendars.json references tenants by identifier; the database uses the new tenant ids instead.
// Rooms embedded in several devices are stored once, matched by id_string.
export async function importCalendarsJson(client: SqliteDBClient, calendars: any): Promise<ImportSummary> {
    if (await client.hasOrganization()) {
        throw new Error("The database already contains a configuration")
    }
    return client.transaction(async () => {
        const summary: ImportSummary = {organization: 0, tenants: 0, rooms: 0, devices: 0}

        if (calendars.global_config) {
            await client.setOrganization(calendars.global_config)
            summary.organization++
        }

        const tenantIds = new Map<string, string>()
        for (const tenant of calendars.exchange?.tenants ?? []) {
            const added = await client.addEwsUser({...tenant, identifier: String(tenant.identifier)})
            tenantIds.set(String(tenant.identifier), added.id)
            summary.tenants++
        }
        const withTenantId = (info: IEWSCalendarInfo | undefined): IEWSCalendarInfo | undefined => {
            if (!info) return info
            const tenant_id = tenantIds.get(String(info.tenant_id))
            if (!tenant_id) throw new Error(`Unknown tenant "${info.tenant_id}" for ${info.email}`)
            return {...info, tenant_id}
        }

        const roomIds = new Map<string, string>()
        for (const device of calendars.devices ?? []) {
            let room_id: string | null = null
            if (isRoom(device.room_id)) {
                const room: IRoom = device.room_id
                room_id = roomIds.get(room.id_string)
                if (!room_id) {
                    const added = await client.addRoom({
                        room_number: room.room_number ?? null,
                        id_string: room.id_string,
                        name: room.name,
                        logo: room.logo,
                        ews_info: withTenantId(room.ews_info),
                        ical_info: room.ical_info,
                        persons: room.persons?.map(person => ({...person, ews_info: withTenantId(person.ews_info)})),
                    })
                    room_id = added.id
                    roomIds.set(room.id_string, room_id)
                    summary.rooms++
                }
            }
            await client.addDevice({
                device_id: device.device_id,
                location: device.location ?? "",
                room_id,
                last_contact: null,
                battery_mv: null,
            })
            summary.devices++
        }
        return summary
    })
}

// Runs on startup: an empty database is filled from config/calendars.json if that file exists
export async function importCalendarsJsonIfEmpty(client: SqliteDBClient, path = CALENDARS_JSON_PATH): Promise<ImportSummary | null> {
    if (await client.hasOrganization() || !fs.existsSync(path)) {
        return null
    }
    const summary = await importCalendarsJson(client, JSON.parse(fs.readFileSync(path, "utf8")))
    Logging.instance.logger.info(`Imported ${path} into the database: ${summary.organization} organization, ` +
        `${summary.tenants} tenants, ${summary.rooms} rooms, ${summary.devices} devices`)
    return summary
}
