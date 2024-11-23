import {IEWSCalendarInfo} from "./IEWSCalendarInfo";
import {IICalCalendarInfo} from "./IICalCalendarInfo";
import {IPerson} from "./IPerson";
import {IDevice} from "./IDevice";
export interface IRoom {
    room_number: number
    id_string: string
    name: string
    logo: string
    ews_info: IEWSCalendarInfo | undefined
    ical_info : IICalCalendarInfo | undefined
    persons: IPerson[] | undefined
    devices: IDevice[]
}

export function isRoom(object: any): object is IRoom {
    return 'room_number' in object;
}