import moment from "moment-timezone"
import * as ews from "ews-javascript-api";

export function isEventToday(start: moment.Moment, end: moment.Moment): boolean {
    const now = ews.DateTime.Now
    const start_of_today = moment().startOf('day');
    const end_of_today = moment().endOf('day');
    // const end_of_today = moment().add(5, 'days').endOf('day');

    return (start <= end_of_today && end >= start_of_today) ||
    (start < start_of_today && end > start_of_today) ||
    (start < end_of_today && end > end_of_today)
    // TODO double check that at some point for logical correctness and behavior
}

export function isEventNow(start: moment.Moment, end: moment.Moment): boolean {
    const now = ews.DateTime.Now
    return (start <= now && end >= now)
}

