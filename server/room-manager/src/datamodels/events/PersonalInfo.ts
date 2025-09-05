import {LegacyFreeBusyStatus} from "ews-javascript-api";
import moment from "moment-timezone";
import {SimpleEvent} from "./SimpleEvent";
import * as utils from '../../utils'


export class PersonalInfo extends SimpleEvent{
    freeBusyStatus: LegacyFreeBusyStatus


    constructor(start: moment.Moment, end: moment.Moment, freeBusyStatus: LegacyFreeBusyStatus) {
        super(start, end, "", "", false, false)
        this.freeBusyStatus = freeBusyStatus;

    }

    get summary(): string {
        return this.getMessage();
    }

    get byline(): string {
        return this.getByline();
    }


    private getMessage(): string {
        switch (this.freeBusyStatus) {
            case LegacyFreeBusyStatus.OOF:
                return "Out of Office"
            case LegacyFreeBusyStatus.Busy:
                return "Busy"
            case LegacyFreeBusyStatus.WorkingElsewhere:
                return "Working Remote"
            // case LegacyFreeBusyStatus.Free:
            //     return "Free"
            default:
                return ""
        }
    }

    private getByline(): string {
        switch (this.freeBusyStatus) {
            case LegacyFreeBusyStatus.OOF:
                return "Until " + utils.getDateStringFromDate(this.end.toDate())
            case LegacyFreeBusyStatus.Busy:
                return "Until " + utils.getTimeStringFromDate(this.end.toDate())
            case LegacyFreeBusyStatus.WorkingElsewhere:
                return ""
            default:
                return ""

        }
    }


}