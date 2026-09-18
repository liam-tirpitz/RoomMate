import {IDevice} from "../../datamodels/IDevice";
import {IRoom} from "../../datamodels/IRoom";
import {IOrganization} from "../../datamodels/IOrganization";
import {DeviceState, IDeviceStatus} from "../../datamodels/IDeviceStatus";
import {getPercentageFromVoltage} from "./utils";

const DEFAULT_OFFLINE_AFTER_MIN = 120
// Devices wake up by their own clock, so allow them to be a little late for a scheduled wake-up
const WAKE_UP_GRACE_MIN = 10

// A device is offline only when it has reported before and missed its next contact: it gets
// device_offline_after_min after its last request, or longer if it announced a later wake-up (night, weekend).
// A device that has never reported (imported, or on the file backend without telemetry) is not called offline.
export function isOffline(device: IDevice, offlineAfterMin: number, now: Date): boolean {
    if (!device.last_contact) return false
    let deadline = new Date(device.last_contact).getTime() + offlineAfterMin * 60_000
    if (device.next_expected_contact) {
        deadline = Math.max(deadline, new Date(device.next_expected_contact).getTime() + WAKE_UP_GRACE_MIN * 60_000)
    }
    return now.getTime() > deadline
}

export function getDeviceState(device: IDevice, organization: IOrganization | undefined, now: Date): DeviceState {
    if (device.room_id == null) return "unconfigured"
    if (isOffline(device, organization?.device_offline_after_min ?? DEFAULT_OFFLINE_AFTER_MIN, now)) return "offline"
    if (device.battery_mv != null && organization && device.battery_mv < organization.low_battery_voltage_cutoff_in_mv) {
        return "low_battery"
    }
    return "ok"
}

export function toDeviceStatus(device: IDevice, room: IRoom | null, organization: IOrganization | undefined, now = new Date()): IDeviceStatus {
    return {
        ...device,
        room_id: room?.id ?? (typeof device.room_id == "string" ? device.room_id : null),
        room: room ? {id: room.id, name: room.name, id_string: room.id_string} : null,
        status: getDeviceState(device, organization, now),
        battery_percent: device.battery_mv != null ? getPercentageFromVoltage(device.battery_mv) : null,
    }
}
