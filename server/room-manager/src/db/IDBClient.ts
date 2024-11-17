import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IRoom} from "../../../datamodels/IRoom";
import {IPerson} from "../../../datamodels/IPerson";
import {IDevice} from "../../../datamodels/IDevice";

export interface IDBClient {
    addOrganization(organization: IOrganization): Promise<void>
    getOrganizationById(id: String): Promise<IOrganization>
    getOrganizations(): Promise<IOrganization[]>

    getRooms(): Promise<IRoom[]>
    deleteRoom(id: string): Promise<void>
    addRoom(room: IRoom): Promise<void>

    getDevices(): Promise<IDevice[]>
    getDevice(device_id: string): Promise<IDevice | null>
    deleteDevice(device_id: string): Promise<void>
    addDevice(device: IDevice): Promise<string>

    getEWSUser(id: String): Promise<IEWSTenant>
    addEWSUser(user: IEWSTenant): Promise<void>


    addPersonToRoom(person: IPerson, room_id: string): Promise<void>
    associateRoomWithDevice(device_id: string, room_id: string): Promise<void>
    getRoomForDevice(device_id: string): Promise<IRoom | null>



}
