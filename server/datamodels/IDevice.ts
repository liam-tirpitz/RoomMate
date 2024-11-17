import {Types} from "mongoose"
import {IRoom} from "./IRoom";

export interface IDevice {
    device_id: string
    location: string
    last_contact: string
    battery: string
    room_id: Types.ObjectId | string | undefined
}