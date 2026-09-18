import moment from "moment-timezone"
import * as ews from "ews-javascript-api";

export function isEventToday(start: moment.Moment, end: moment.Moment): boolean {
    const now = ews.DateTime.Now
    const start_of_today = moment().startOf('day');
    const end_of_today = moment().endOf('day');
    // const end_of_today = moment().add(5, 'days').endOf('day');
    // console.log(start.valueOf(), end.valueOf(), start_of_today.valueOf(), end_of_today.valueOf() )

    return (start <= end_of_today && end >= start_of_today) ||
    (start < start_of_today && end >= start_of_today) ||
    (start < end_of_today && end >= end_of_today)
    // TODO double check that at some point for logical correctness and behavior
}

export function isEventNow(start: moment.Moment, end: moment.Moment): boolean {
    const now = ews.DateTime.Now
    return (start.valueOf() <= now.valueOf() && end.valueOf() >= now.valueOf())
}

export function hasEventPassed(end: moment.Moment): boolean {
    const now = ews.DateTime.Now
    return (end.valueOf() <= now.valueOf())
}

export function getTimeStringFromDate(date: Date): string {
    return date.toLocaleTimeString(['de'], {hour: '2-digit', minute:'2-digit'})
}

export function getDateStringFromDate(date: Date): string {
    return date.toLocaleString('de-DE', {day: "2-digit", month: "2-digit", year: "2-digit"})
}

// Rough charge level of the Feather's LiPo, in steps of 10 %
export function getPercentageFromVoltage(v: number): number {
    if (v > 4200) {
        return 100
    } else if (v > 4150) {
        return 90
    } else if (v > 4100) {
        return 80
    } else if (v > 4050) {
        return 70
    } else if (v > 4000) {
        return 60
    } else if (v > 3950) {
        return 50
    } else if (v > 3900) {
        return 40
    } else if (v > 3850) {
        return 30
    } else if (v > 3800) {
        return 20
    } else if (v > 3700) {
        return 10
    } else {
        return 0
    }
}
