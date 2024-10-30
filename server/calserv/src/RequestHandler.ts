import {EWSCalendarClient} from "./calendar-apis/ews";
import {Logging} from "./logging";
import {BookableResourceImageProcessor} from "./image_processing/BookableResourceImageProcessor";
import {ConfigRetrieval} from "./ConfigRetrieval";
import * as ews from "ews-javascript-api";
import {LegacyFreeBusyStatus} from "ews-javascript-api";
import * as config from "../config/calendars.json";
import {DayOfWeek} from "ews-javascript-api/js/Enumerations/DayOfWeek";
import crypto from "crypto";
import {InfoPacket} from "./datamodels/InfoPacket";
import {SimpleEvent} from "./datamodels/SimpleEvent";
import {Room} from "./datamodels/Room";
import {ICalClient} from "./calendar-apis/ical";
import {OfficeImageProcesor} from "./image_processing/OfficeImageProcesor";
import {Person} from "./datamodels/Person";
import {PersonalInfo} from "./datamodels/PersonalInfo";
import * as utils from "./utils"
import {SpecialStateImageProcessor} from "./image_processing/SpecialStateImageProcessor";
import {EWSTenant} from "./datamodels/EWSTenant";
const { format } = require('logform');

export class RequestHandler {
    dataRetrieval: ConfigRetrieval
    iCalClient: ICalClient

    constructor() {
        this.dataRetrieval = new ConfigRetrieval()
        this.iCalClient = new ICalClient()
    }

    getEWSClient(tenantID) {
        const configRetrieval = new ConfigRetrieval()
        const tenant = configRetrieval.getExchangeTenantByID(tenantID)
        return new EWSCalendarClient(tenant)
    }

    async getAppointments(calendarDetails: Room): Promise<SimpleEvent[]> {
        if (calendarDetails.ews_info) {
            const ews_client = this.getEWSClient(calendarDetails.ews_info.tenant_id)
            return ews_client.readUpcomingEventsToday(calendarDetails.ews_info.email)
        } else if (calendarDetails.ical_info){
            return this.iCalClient.readUpcomingEventsToday(calendarDetails.ical_info)
        } else if (calendarDetails.persons) {
            let appointments: PersonalInfo[] = [];
            let personal_appointments: PersonalInfo[][] = []
            for (const person of calendarDetails.persons as Person[]) {
                const ews_client = this.getEWSClient(person.ews_info.tenant_id)
                personal_appointments.push((await ews_client.readPersonsAvailabilityToday([person.ews_info.email]))[0])
            }
            appointments = personal_appointments.reduce((accumulator, value) => accumulator.concat(value), []); // TODO sorting so upcoming event is first
            return appointments
        } else {
            return
        }
    }

    getOoOFromPerson(infos : PersonalInfo[]): PersonalInfo {
        const result = infos.filter(value =>
            value.freeBusyStatus == LegacyFreeBusyStatus.OOF && utils.isEventToday(value.start, value.end))
        result.sort((a,b) => b.end.valueOf() - a.end.valueOf())
        if (result.length > 0) {
            return result[0]
        } else {
            return
        }
    }

    getBusyFromPerson(infos : PersonalInfo[]): PersonalInfo {
        const result = infos.filter(value =>
            (value.freeBusyStatus == LegacyFreeBusyStatus.Busy || LegacyFreeBusyStatus.WorkingElsewhere)
            && utils.isEventNow(value.start, value.end))
        result.sort((a,b) => b.end.valueOf() - a.end.valueOf())
        if (result.length > 0) {
            return result[0]
        } else {
            return
        }
    }

    async getCurrentStatusFromPerson(ewsClient: EWSCalendarClient, person: Person) {
        const result = await ewsClient.readPersonsAvailabilityToday([person.ews_info.email])
        const ooOResult = this.getOoOFromPerson(result[0])
        if (!ooOResult) {
            return this.getBusyFromPerson(result[0])
        } else {
            return ooOResult
        }
    }


    async getImage(device_id: string, voltage: number): Promise<string> {
        const calendarDetails = this.dataRetrieval.getRoomFromDeviceID(device_id)
        let image_processor

        if (!calendarDetails) {
            image_processor = new SpecialStateImageProcessor()
            await image_processor.buildNewDeviceImage(device_id)
            Logging.instance.logger.warn('Device-ID not found.', {devid: device_id});
            return image_processor.finalizeImage("new")
        }
        let ews_client: EWSCalendarClient
        if (calendarDetails.ews_info) {
            ews_client = this.getEWSClient(calendarDetails.ews_info.tenant_id)
        }

         if (calendarDetails.persons) {
            let freeBusyDetails: PersonalInfo[] = []
            for (const person of calendarDetails.persons as Person[]) {
                ews_client = this.getEWSClient(person.ews_info.tenant_id)
                freeBusyDetails.push(await this.getCurrentStatusFromPerson(ews_client, person))
            }
            image_processor = new OfficeImageProcesor()
            await image_processor.buildImage(calendarDetails, freeBusyDetails, voltage)
        } else {
             if (voltage && voltage < config.global_config.low_battery_voltage_cutoff_in_mv) {
                 Logging.instance.logger.warn('Low Battery!', {voltage: voltage, devid: device_id});
                 image_processor = new SpecialStateImageProcessor()
                 await image_processor.buildLowBatImage(calendarDetails, voltage)
             } else {
                 const appointments = this.getAppointments(calendarDetails)
                 image_processor = new BookableResourceImageProcessor()
                 await image_processor.buildImage(calendarDetails.name, calendarDetails.id_string, calendarDetails.id_string, calendarDetails.logo, await appointments)
             }
        }
        return await image_processor.finalizeImage(calendarDetails.id_string)
    }

    async getData(device_id: string): Promise<string> {
        let calendarData: InfoPacket = new InfoPacket();
        const calendarDetails = this.dataRetrieval.getRoomFromDeviceID(device_id)
        if (!calendarDetails) return
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
        if (hours_of_day >= config.global_config.night_start_hour  || hours_of_day < (config.global_config.night_end_hour-1)) {
            calendarData.is_night = true
        }
        const day_of_week = now.DayOfWeek
        if (day_of_week == DayOfWeek.Sunday || day_of_week == DayOfWeek.Saturday || (day_of_week == DayOfWeek.Friday && hours_of_day >= config.global_config.night_start_hour)) {
            calendarData.is_weekend = true
        }
        if (calendarData.is_night) {
            let next_day = 0
            if (now.Hour >= config.global_config.night_start_hour) next_day = 1 // Only move to next day if the request was sent before midnight, otherwise stay on the current day
            let updateTime = now.AddDays(next_day).MomentDate.startOf("day")
            updateTime.set("hour", config.global_config.night_end_hour)
            calendarData.next_update_unix = updateTime.unix()
        } else if (calendarData.is_weekend) { // Its the weekend, but not the night
            if (appointments.length == 0) {
                let updateTime = now.AddDays(1).MomentDate.startOf("day")
                updateTime.set("hour", config.global_config.night_end_hour)
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