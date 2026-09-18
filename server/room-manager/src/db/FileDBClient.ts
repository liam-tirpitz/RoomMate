import {IDBClient, IDeviceTelemetry, IScreen} from "./IDBClient";
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IDevice} from "../../../datamodels/IDevice";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IRoom, isRoom} from "../../../datamodels/IRoom";
import {IBatterySample} from "../../../datamodels/IBatterySample";

export class FileDBClient implements IDBClient {
    calendars: any

    static #instance: FileDBClient;

    private constructor() {
        this.calendars = require('../../config/calendars.json');
    }

    public static get instance(): FileDBClient {
        if (!FileDBClient.#instance) {
            FileDBClient.#instance = new FileDBClient();
        }

        return FileDBClient.#instance;
    }

    setOrganization(org: IOrganization): Promise<IOrganization> {
        return Promise.resolve(undefined);
    }


    addDevice(device: IDevice): Promise<IDevice> {
        return Promise.resolve(undefined);
    }

    addEwsUser(user: IEWSTenant): Promise<IEWSTenant> {
        return Promise.resolve(undefined);
    }

    addRoom(room: IRoom): Promise<IRoom> {
        return Promise.resolve(undefined);
    }


    deleteDevice(device_id: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    deleteRoom(id: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    deleteEwsUser(id: string) {
    }


    getDevice(device_id: string): Promise<IDevice | null> {
        return Promise.resolve(this.fileDevices().find(device => device.device_id == device_id));
    }

    getDeviceFromHardwareID(id: string): Promise<IDevice> {
        for (const device of this.calendars.devices as IDevice[]) {
            if (device.device_id == id) {
                return Promise.resolve(device)
            }
        }
        return Promise.resolve(undefined)
    }


    getDevices(): Promise<IDevice[]> {
        return Promise.resolve(this.fileDevices());
    }

    async getDevicesWithRooms(): Promise<Array<IDevice & {room: IRoom | null}>> {
        return this.fileDevices().map(device => ({...device, room: this.embeddedRoom(device.device_id)}))
    }

    getEwsUser(id: String): Promise<IEWSTenant> {
        for (const tenant of this.calendars.exchange.tenants as IEWSTenant[]) {
            if (tenant.identifier == id) {
                return Promise.resolve(tenant)
            }
        }
        return Promise.resolve(undefined)
    }

    getEwsUsers(): Promise<Array<IEWSTenant>> {
        const tenants = this.calendars.exchange.tenants as IEWSTenant[]
        return Promise.resolve(tenants.map(tenant => ({...tenant, id: String(tenant.identifier)})));
    }


    getOrganization(): Promise<IOrganization> {
        return Promise.resolve(this.calendars.global_config);
    }

    getRoomForDevice(device_id: string): Promise<IRoom | null> {
        for (const device of this.calendars.devices as IDevice[]) {
            if (device.device_id == device_id) {
                if (isRoom(device.room_id)) {
                    return Promise.resolve(device.room_id)
                }
            }
        }
        return Promise.resolve(undefined)

    }

    getRooms(): Promise<IRoom[]> {
        return Promise.resolve(this.fileDevices().map(device => this.embeddedRoom(device.device_id)).filter(room => room));
    }

    getRoom(id: string): Promise<IRoom> {
        return Promise.resolve(this.embeddedRoom(id) ?? undefined);
    }

    updateDevice(id: string, device: IDevice): Promise<IDevice> {
        return Promise.resolve(undefined);
    }

    updateEwsUser(id: string, user: IEWSTenant): Promise<IEWSTenant> {
        return Promise.resolve(undefined);
    }

    updateRoom(id: string, room: IRoom): Promise<IRoom> {
        return Promise.resolve(undefined);
    }

    // Telemetry and screens are not kept on the file backend

    touchDevice(device_id: string, telemetry: IDeviceTelemetry): Promise<IDevice> {
        return Promise.resolve(undefined);
    }

    setRedrawRequested(device_id: string, flag: boolean): Promise<void> {
        return Promise.resolve();
    }

    addBatterySample(device_id: string, voltage_mv: number, ts: string): Promise<void> {
        return Promise.resolve();
    }

    getBatteryHistory(device_id: string, from: string, to: string): Promise<IBatterySample[]> {
        return Promise.resolve([]);
    }

    pruneBatterySamples(olderThan: string): Promise<number> {
        return Promise.resolve(0);
    }

    saveScreen(device_id: string, png: Buffer, hash: string | null): Promise<void> {
        return Promise.resolve();
    }

    getScreen(device_id: string): Promise<IScreen | null> {
        return Promise.resolve(null);
    }

    // calendars.json embeds one room per device, so each device gets its own room with id = device_id
    private fileDevices(): IDevice[] {
        return (this.calendars.devices as IDevice[]).map(device => ({
            device_id: device.device_id,
            location: device.location ?? "",
            room_id: isRoom(device.room_id) ? device.device_id : null,
            last_contact: null,
            battery_mv: null,
            next_expected_contact: null,
            redraw_requested: false,
        }))
    }

    private embeddedRoom(device_id: string): IRoom | null {
        const device = (this.calendars.devices as IDevice[]).find(device => device.device_id == device_id)
        return device && isRoom(device.room_id) ? {...device.room_id, id: device.device_id} : null
    }
}
