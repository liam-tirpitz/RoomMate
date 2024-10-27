import {EWSCalendarInfo} from "./EWSCalendarInfo";
import {ICalCalendarInfo} from "./ICalCalendarInfo";

export class Room {
    id: number
    id_string: string
    name: string
    logo: string
    ews_info: EWSCalendarInfo | undefined
    ical_info : ICalCalendarInfo | undefined


    constructor(id: number, id_string: string, name: string, logo: string, ews_info: EWSCalendarInfo | undefined, ical_info: ICalCalendarInfo | undefined) {
        this.id = id;
        this.id_string = id_string;
        this.name = name;
        this.logo = logo;
        this.ews_info = ews_info;
        this.ical_info = ical_info;
    }
}