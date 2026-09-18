import {IEWSCalendarInfo} from "./IEWSCalendarInfo";
import {IICalCalendarInfo} from "./IICalCalendarInfo";
import {IPerson} from "./IPerson";
export interface IRoom {
    id?: string
    room_number: number
    id_string: string
    name: string
    logo: string
    ews_info: IEWSCalendarInfo | undefined
    ical_info : IICalCalendarInfo | undefined
    persons: IPerson[] | undefined
}

export function isRoom(object: any): object is IRoom {
    return 'room_number' in object;
}