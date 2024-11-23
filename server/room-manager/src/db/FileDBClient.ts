import {IDBClient} from "./IDBClient";
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IDevice} from "../../../datamodels/IDevice";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IRoom, isRoom} from "../../../datamodels/IRoom";
import {WithId} from "mongodb";

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


    getDevice(device_id: string): Promise<WithId<IDevice> | null> {
        return Promise.resolve(undefined);
    }

    getDeviceFromHardwareID(id: string): Promise<IDevice> {
        for (const device of this.calendars.devices as IDevice[]) {
            if (device.device_id == id) {
                return Promise.resolve(device)
            }
        }
        return undefined
    }


    getDevices(): Promise<WithId<IDevice>[]> {
        return Promise.resolve([]);
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
        return Promise.resolve(this.calendars.exchange.tenants);
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
        return undefined

    }

    getRooms(): Promise<IRoom[]> {
        return Promise.resolve([]);
    }

    getRoom(id: string): Promise<IRoom> {
        return Promise.resolve(undefined);
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






}
