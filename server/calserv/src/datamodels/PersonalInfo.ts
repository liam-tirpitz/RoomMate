import {CalendarEvent, LegacyFreeBusyStatus} from "ews-javascript-api";
import moment from "moment-timezone";

export class PersonalInfo {
    freeBusyStatus: LegacyFreeBusyStatus
    start: moment.Moment
    end: moment.Moment


    constructor(start: moment.Moment, end: moment.Moment, freeBusyStatus: LegacyFreeBusyStatus) {
        this.start = start;
        this.end = end;
        this.freeBusyStatus = freeBusyStatus;

    }

    public getMessage(): string {
        switch (this.freeBusyStatus) {
            case LegacyFreeBusyStatus.OOF:
                return "Out of Office"
            case LegacyFreeBusyStatus.Busy:
                return "Busy"
        }
    }

    public getByline(): string {
        switch (this.freeBusyStatus) {
            case LegacyFreeBusyStatus.OOF:
                return "Until " + this.end.toDate().toLocaleDateString(undefined, {day: "2-digit", month: "2-digit", year: "numeric"})
            case LegacyFreeBusyStatus.Busy:
                return "Busy"
        }
    }


}