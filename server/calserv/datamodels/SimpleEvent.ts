import * as moment from "moment-timezone";
import {DateTime} from "ews-javascript-api";

export class SimpleEvent {
    start: moment.Moment;
    end: moment.Moment;
    summary: string;
    organizer: string;
    is_cancelled: boolean;

    constructor(start: moment.Moment, end: moment.Moment, summary: string, organizer: string, is_cancelled: boolean) {
        this.start = start;
        this.end = end;
        this.summary = summary;
        this.organizer = organizer;
        this.is_cancelled = is_cancelled;
    }

    happeningNow(now: DateTime): boolean {
        return this.start <= now.MomentDate && now.MomentDate <= this.end
    }

    happeningSoon(now: DateTime): boolean {
        return now.MomentDate < this.start && (this.start.valueOf() - now.valueOf()) < 15 * 60 * 1000

    }


}