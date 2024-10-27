import {SimpleEvent} from "../datamodels/SimpleEvent";
import {ICalCalendarInfo} from "../datamodels/ICalCalendarInfo";
import moment from "moment-timezone"
import * as ews from "ews-javascript-api";
import * as utils from "../utils"

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
        let results: SimpleEvent[] = []

        for (let k in data) {
            const event = data[k];
            if (event.type === "VEVENT") {

                const simpleEvent = new SimpleEvent(moment(event.start), moment(event.end), this.cleanSummaryString(event.summary), event.description, false)
                if (utils.isEventToday(simpleEvent.start, simpleEvent.end)) {
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