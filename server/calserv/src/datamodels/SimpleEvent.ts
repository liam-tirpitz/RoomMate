import * as moment from "moment-timezone";
import {DateTime} from "ews-javascript-api";
import * as config from '../../config/calendars.json'

export class SimpleEvent {
    start: moment.Moment;
    end: moment.Moment;
    private readonly _summary: string;
    private readonly _byline: string;
    is_cancelled: boolean;

    constructor(start: moment.Moment, end: moment.Moment, summary: string, organizer: string, is_cancelled: boolean) {
        this.start = start;
        this.end = end;
        this._summary = summary;
        this._byline = organizer;
        this.is_cancelled = is_cancelled;
    }


    get summary(): string {
        return this._summary;
    }

    get byline(): string {
        return this._byline;
    }

    happeningNow(now: DateTime): boolean {
        return this.start <= now.MomentDate && now.MomentDate <= this.end
    }

    happeningSoon(now: DateTime): boolean {
        return now.MomentDate < this.start && (this.start.valueOf() - now.valueOf()) < config.global_config.soon_threshold_in_min * 60 * 1000

    }


}