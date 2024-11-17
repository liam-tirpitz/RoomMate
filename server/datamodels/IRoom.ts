import {IEWSCalendarInfo} from "./IEWSCalendarInfo";
import {IICalCalendarInfo} from "./IICalCalendarInfo";
import {IPerson} from "./IPerson";
import {IDevice} from "./IDevice";
import {ObjectId} from "mongodb";

export interface IRoom {
    room_number: number
    id_string: string
    name: string
    logo: string
    ews_info: IEWSCalendarInfo | undefined
    ical_info : IICalCalendarInfo | undefined
    persons: IPerson[] | undefined
    devices: IDevice[]
    device_ids: string[]
}