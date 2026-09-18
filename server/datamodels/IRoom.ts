import {IEWSCalendarInfo} from "./IEWSCalendarInfo";
import {IICalCalendarInfo} from "./IICalCalendarInfo";
import {IPerson} from "./IPerson";
export interface IRoom {
    id?: string
    // Optional for offices
    room_number: number | null
    id_string: string
    name: string
    logo: string
    ews_info: IEWSCalendarInfo | undefined
    ical_info : IICalCalendarInfo | undefined
    persons: IPerson[] | undefined
}

export function isRoom(object: any): object is IRoom {
    // Offices have no room_number, but every room has an id_string
    return typeof object == 'object' && object !== null && 'id_string' in object;
}