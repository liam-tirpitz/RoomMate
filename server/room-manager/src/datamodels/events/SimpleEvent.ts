import * as moment from "moment-timezone";
import {DateTime} from "ews-javascript-api";
import * as config from '../../../config/calendars.json'
import * as utils from '../../utils'

export class SimpleEvent {
    start: moment.Moment;
    end: moment.Moment;
    private readonly _summary: string;
    private readonly _byline: string;
    is_cancelled: boolean;
    is_allday: boolean

    constructor(start: moment.Moment, end: moment.Moment, summary: string, organizer: string, is_cancelled: boolean, is_allday) {
        this.start = start;
        this.end = end;
        this._summary = summary;
        this._byline = organizer;
        this.is_cancelled = is_cancelled;
        this.is_allday = is_allday;
    }


    get summary(): string {
        return this._summary;
    }

    get byline(): string {
        return this._byline;
    }



    get timeline(): string {
        let endbefore = this.end.clone()
        endbefore.add(-1, 'second')

        if (!this.is_allday) {
            if (this.start.isSame(Date.now(), 'day') &&  this.end.isSame(Date.now(), 'day')) {
                return utils.getTimeStringFromDate(this.start.toDate()) + " - " + utils.getTimeStringFromDate(this.end.toDate());
            } else {
                return utils.getDateStringFromDate(this.start.toDate()) + " (" + utils.getTimeStringFromDate(this.start.toDate()) + ") - "
                    + utils.getDateStringFromDate(this.end.toDate()) +  " (" + utils.getTimeStringFromDate(this.end.toDate()) + ")";
            }
        } else if (endbefore.isSame(Date.now(), 'day')) {
            return "Until End of Today"
        } else {
            return "Until End of " + utils.getDateStringFromDate(this.end.toDate())
        }
    }

    happeningNow(now: DateTime): boolean {
        return this.start <= now.MomentDate && now.MomentDate <= this.end
    }

    happeningSoon(now: DateTime): boolean {
        return now.MomentDate < this.start && (this.start.valueOf() - now.valueOf()) < config.global_config.soon_threshold_in_min * 60 * 1000

    }


}