import {SimpleEvent} from "../datamodels/SimpleEvent";
import {ICalCalendarInfo} from "../datamodels/ICalCalendarInfo";
import moment from "moment-timezone"
import * as ews from "ews-javascript-api";

export class ICalClient {

    cleanSummaryString(input: string) {
        let result = input.replace(", Standardgruppe", "")
        if (result.charAt(2) == ".") {
            const pos = result.indexOf(" ")
            result = result.substring(pos + 1)
        }
        return result
    }


    async readUpcomingEventsToday(icalInfo: ICalCalendarInfo): Promise<SimpleEvent[]> {
        const data = await this.getCalendar(icalInfo.endpoint)
        const now = ews.DateTime.Now
        const start_of_today = moment().startOf('day');
        const end_of_today = moment().endOf('day');
        // const end_of_today = moment().add(5, 'days').endOf('day');

        let results: SimpleEvent[] = []

        for (let k in data) {
            const event = data[k];
            if (event.type === "VEVENT") {

                const simpleEvent = new SimpleEvent(moment(event.start), moment(event.end), this.cleanSummaryString(event.summary), event.description, false)
                if ((simpleEvent.start <= end_of_today && simpleEvent.end >= start_of_today) ||
                    (simpleEvent.start < start_of_today && simpleEvent.end > start_of_today) ||
                    (simpleEvent.start < end_of_today && simpleEvent.end > end_of_today) // TODO double check that at some point for logical correctness and behavior
                ) {
                    results.push(simpleEvent)
                }
            }
        }
        results.sort((a,b)=> a.start.valueOf() - b.start.valueOf())
        return results
    }

    async getCalendar(endpoint){
        const ical = require('node-ical');
        return ical.async.fromURL(endpoint);
    }

}