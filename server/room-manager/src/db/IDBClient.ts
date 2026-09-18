import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IRoom} from "../../../datamodels/IRoom";
import {IDevice} from "../../../datamodels/IDevice";
import {IBatterySample} from "../../../datamodels/IBatterySample";

export interface IScreen {
    png: Buffer
    // ISO timestamp
    rendered_at: string
    hash: string | null
}

export interface IDeviceTelemetry {
    last_contact: string
    battery_mv?: number
    next_expected_contact?: string
}

// Devices are addressed by their MAC without colons (device_id), rooms and tenants by id.
// Read methods are implemented by every client. The file backend ignores writes and returns undefined;
// the management API answers 501 before they are reached.
export interface IDBClient {
    updateRoom(id: string, room: IRoom): Promise<IRoom>
    addRoom(room: IRoom): Promise<IRoom>
    deleteRoom(id: string)
    getRooms(): Promise<Array<IRoom>>
    getRoom(id: string): Promise<IRoom>

    updateDevice(device_id: string, device: IDevice): Promise<IDevice>
    addDevice(device: IDevice): Promise<IDevice>
    deleteDevice(device_id: string)
    getDevices(): Promise<Array<IDevice>>
    getDevice(device_id: string): Promise<IDevice>
    getDeviceFromHardwareID(id: string): Promise<IDevice>
    getRoomForDevice(device_id: string): Promise<IRoom | null>
    getDevicesWithRooms(): Promise<Array<IDevice & {room: IRoom | null}>>
    // Records a request from a device. An unknown MAC creates an unconfigured device (room_id null).
    touchDevice(device_id: string, telemetry: IDeviceTelemetry): Promise<IDevice>
    setRedrawRequested(device_id: string, flag: boolean): Promise<void>

    addBatterySample(device_id: string, voltage_mv: number, ts: string): Promise<void>
    // Samples with from <= ts <= to, oldest first
    getBatteryHistory(device_id: string, from: string, to: string): Promise<IBatterySample[]>
    pruneBatterySamples(olderThan: string): Promise<number>

    saveScreen(device_id: string, png: Buffer, hash: string | null): Promise<void>
    getScreen(device_id: string): Promise<IScreen | null>

    updateEwsUser(id: string, user: IEWSTenant): Promise<IEWSTenant>
    addEwsUser(user: IEWSTenant): Promise<IEWSTenant>
    deleteEwsUser(id: string)
    getEwsUsers(): Promise<Array<IEWSTenant>>
    getEwsUser(id: string): Promise<IEWSTenant>

    setOrganization(org: IOrganization): Promise<IOrganization>
    getOrganization(): Promise<IOrganization>

}
