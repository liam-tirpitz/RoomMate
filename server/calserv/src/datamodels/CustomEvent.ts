import {SimpleEvent} from "./SimpleEvent";
import moment from "moment-timezone";

export class CustomEvent extends SimpleEvent {
    lines: string[]

    constructor(start: moment.Moment, end: moment.Moment, summary: string, organizer: string, is_cancelled: boolean, is_allday: boolean, lines: string[]) {
        super(start, end, summary, organizer, is_cancelled, is_allday);
        this.lines = lines;
    }
}