import {IDBClient} from "./IDBClient";
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IDevice} from "../../../datamodels/IDevice";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IPerson} from "../../../datamodels/IPerson";
import {IRoom} from "../../../datamodels/IRoom";
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


    addDevice(device: IDevice): Promise<string> {
        return Promise.resolve(undefined);
    }

    addEWSUser(user: IEWSTenant): Promise<void> {
        return Promise.resolve(undefined);
    }

    addOrganization(organization: IOrganization): Promise<void> {
        return Promise.resolve(undefined);
    }

    addPersonToRoom(person: IPerson, room_id: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    addRoom(room: IRoom): Promise<void> {
        return Promise.resolve(undefined);
    }

    associateRoomWithDevice(device_id: string, room_id: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    deleteDevice(device_id: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    deleteRoom(id: string): Promise<void> {
        return Promise.resolve(undefined);
    }

    getDevice(device_id: string): Promise<WithId<IDevice> | null> {
        return Promise.resolve(undefined);
    }

    getDevices(): Promise<WithId<IDevice>[]> {
        return Promise.resolve([]);
    }

    getEWSUser(id: String): Promise<IEWSTenant> {
        for (const tenant of this.calendars.exchange.tenants as IEWSTenant[]) {
            if (tenant.id == id) {
                return Promise.resolve(tenant)
            }
        }
        return undefined
    }

    getOrganizationById(id: String): Promise<IOrganization> {
        return Promise.resolve(this.calendars.global_config);
    }

    getOrganizations(): Promise<WithId<IOrganization>[]> {
        return Promise.resolve([]);
    }

    getRoomForDevice(device_id: string): Promise<IRoom | null> {
        for (const room of this.calendars.calendars as IRoom[]) {
            for (const device of room.devices as IDevice[]) {
                if (device.device_id == device_id) {
                    return Promise.resolve(room)
                }
            }
        }
        return undefined

    }

    getRooms(): Promise<IRoom[]> {
        return Promise.resolve([]);
    }

}
