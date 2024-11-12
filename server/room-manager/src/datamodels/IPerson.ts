import {IEWSCalendarInfo} from "./IEWSCalendarInfo";

export interface IPerson {
    name: string
    job: string
    group: string
    ews_info: IEWSCalendarInfo
    phone: string | undefined
    email: string | undefined
}