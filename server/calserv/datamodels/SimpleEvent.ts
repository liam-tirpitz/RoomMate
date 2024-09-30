import * as moment from "moment-timezone";

export class SimpleEvent {
    start: moment;
    end: moment;
    summary: string;
    organizer: string;
    is_cancelled: boolean;

    constructor(start: moment, end: moment, summary: string, organizer: string, is_cancelled: boolean) {
        this.start = start;
        this.end = end;
        this.summary = summary;
        this.organizer = organizer;
        this.is_cancelled = is_cancelled;
    }
}