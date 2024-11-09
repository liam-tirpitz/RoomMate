import {EWSCalendarInfo} from "./EWSCalendarInfo";

export class Person {
    name: string
    job: string
    group: string
    ews_info: EWSCalendarInfo
    phone: string | undefined
    email: string | undefined
}