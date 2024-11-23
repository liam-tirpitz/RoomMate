import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IOrganization} from "../../../datamodels/IOrganization";
import {IRoom} from "../../../datamodels/IRoom";
import {IPerson} from "../../../datamodels/IPerson";
import {IDevice} from "../../../datamodels/IDevice";

export interface IDBClient {
    updateRoom(id: string, room: IRoom): Promise<IRoom>
    addRoom(room: IRoom): Promise<IRoom>
    deleteRoom(id: string)
    getRooms(): Promise<Array<IRoom>>
    getRoom(id: string): Promise<IRoom>

    updateDevice(id: string, device: IDevice): Promise<IDevice>
    addDevice(device: IDevice): Promise<IDevice>
    deleteDevice(id: string)
    getDevices(): Promise<Array<IDevice>>
    getDevice(id: string): Promise<IDevice>

    updateEwsUser(id: string, user: IEWSTenant): Promise<IEWSTenant>
    addEwsUser(user: IEWSTenant): Promise<IEWSTenant>
    deleteEwsUser(id: string)
    getEwsUsers(): Promise<Array<IEWSTenant>>
    getEwsUser(id: string): Promise<IEWSTenant>
}
