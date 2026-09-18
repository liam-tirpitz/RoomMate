import {IRoom} from "./IRoom";

export interface IDevice {
    id?: string
    // MAC address without colons, unique
    device_id: string
    location: string
    // The file backend embeds the room; the SQLite backend references it by id
    room_id: string | IRoom | null
    // ISO timestamps
    last_contact: string | null
    next_expected_contact?: string | null
    battery_mv: number | null
    redraw_requested?: boolean
}
