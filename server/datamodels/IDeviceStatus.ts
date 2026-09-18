import {IDevice} from "./IDevice";
import {IRoom} from "./IRoom";

export type DeviceState = 'ok' | 'low_battery' | 'offline' | 'unconfigured'

// Returned by GET /api/devices. Never stored.
export interface IDeviceStatus extends IDevice {
    room: Pick<IRoom, 'id' | 'name' | 'id_string'> | null
    status: DeviceState
    battery_percent: number | null
}
