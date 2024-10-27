import {EWSCalendarClient} from "./calendar-apis/ews";
import {Logging} from "./logging";
import {ImageProcessor} from "./image_processing/imageprocessing";
import {DataRetrieval} from "./DataRetrieval";
import * as ews from "ews-javascript-api";
import * as appconf from "../config/application.json";
import {DayOfWeek} from "ews-javascript-api/js/Enumerations/DayOfWeek";
import crypto from "crypto";
import {InfoPacket} from "./datamodels/InfoPacket";
import {SimpleEvent} from "./datamodels/SimpleEvent";
import {Room} from "./datamodels/Room";
import {ICalClient} from "./calendar-apis/ical";

export class RequestHandler {
    dataRetrieval: DataRetrieval
    ewsClient: EWSCalendarClient
    iCalClient: ICalClient

    constructor() {
        this.dataRetrieval = new DataRetrieval()
        this.ewsClient = new EWSCalendarClient()
        this.iCalClient = new ICalClient()
    }

    async getAppointments(calendarDetails: Room): Promise<SimpleEvent[]> {
        let appointments
        if (calendarDetails.ews_info) {
            return this.ewsClient.readUpcomingEventsToday(calendarDetails.ews_info.email)
        } else if (calendarDetails.ical_info){
            return this.iCalClient.readUpcomingEventsToday(calendarDetails.ical_info)
        } else {
            return
        }
    }


    async getImage(device_id: string): Promise<string> {
        const calid = this.dataRetrieval.getCalendarIDFromDeviceID(device_id)
        if (!calid) return
        const calendarDetails = this.dataRetrieval.getCalendarFromCalendarID(calid)
        const appointments = this.getAppointments(calendarDetails)
        Logging.instance.logger.info("Image requested for: " + device_id)
        const image_processor = new ImageProcessor()
        const img = await image_processor.buildImage(calendarDetails.name, calendarDetails.id_string, calendarDetails.id_string, calendarDetails.logo, await appointments)
        return img
    }

    async getData(device_id: string): Promise<string> {
        let calendarData: InfoPacket = new InfoPacket();
        const calid = this.dataRetrieval.getCalendarIDFromDeviceID(device_id)
        if (!calid) return
        const calendarDetails = this.dataRetrieval.getCalendarFromCalendarID(calid)
        const appointments = await this.getAppointments(calendarDetails)


        const now = ews.DateTime.Now
        calendarData.next_appointments = appointments
        calendarData.room_number = calendarDetails.id_string
        calendarData.room_name = calendarDetails.name

        let next_update: moment.Moment = undefined
        if (appointments.length > 0) {
            if (appointments[0].happeningNow(now)) {
                next_update = appointments[0].end
            } else {
                next_update = appointments[0].start
            }
        }
        if (next_update) {
            calendarData.next_update_unix = next_update.unix()
        }
        const hours_of_day = now.Hour
        if (hours_of_day >= appconf.night_start_hour  || hours_of_day < (appconf.night_end_hour-1)) {
            calendarData.is_night = true
        }
        const day_of_week = now.DayOfWeek
        if (day_of_week == DayOfWeek.Sunday || day_of_week == DayOfWeek.Saturday || (day_of_week == DayOfWeek.Friday && hours_of_day >= appconf.night_start_hour)) {
            calendarData.is_weekend = true
        }
        if (calendarData.is_night) {
            let next_day = 0
            if (now.Hour >= appconf.night_start_hour) next_day = 1 // Only move to next day if the request was sent before midnight, otherwise stay on the current day
            let updateTime = now.AddDays(next_day).MomentDate.startOf("day")
            updateTime.set("hour", appconf.night_end_hour)
            calendarData.next_update_unix = updateTime.unix()
        } else if (calendarData.is_weekend) { // Its the weekend, but not the night
            if (appointments.length == 0) {
                let updateTime = now.AddDays(1).MomentDate.startOf("day")
                updateTime.set("hour", appconf.night_end_hour)
                calendarData.next_update_unix = updateTime.unix()
            }
        }


        const hash_string = JSON.stringify(calendarData)
        calendarData.next_appointments = undefined
        calendarData.hash = crypto.createHash('md5').update(hash_string).digest('hex');
        calendarData.current_time_string = now.MomentDate.toISOString()
        calendarData.current_time_unix = now.MomentDate.unix()

        Logging.instance.logger.info("Data requested for: " + device_id)
        return JSON.stringify(calendarData)
    }

}