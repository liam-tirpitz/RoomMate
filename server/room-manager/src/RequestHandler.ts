import {EWSCalendarClient} from "./calendar-apis/ews";
import {Logging} from "./logging";
import {BookableResourceImageProcessor} from "./image_processing/BookableResourceImageProcessor";
import * as ews from "ews-javascript-api";
import {LegacyFreeBusyStatus} from "ews-javascript-api";
import {DayOfWeek} from "ews-javascript-api/js/Enumerations/DayOfWeek";
import crypto from "crypto";
import {IInfoPacket} from "../../datamodels/IInfoPacket";
import {SimpleEvent} from "./datamodels/events/SimpleEvent";
import {IRoom, isRoom} from "../../datamodels/IRoom";
import {ICalClient} from "./calendar-apis/ical";
import {OfficeImageProcesor} from "./image_processing/OfficeImageProcesor";
import {IPerson} from "../../datamodels/IPerson";
import {PersonalInfo} from "./datamodels/events/PersonalInfo";
import * as utils from "./utils"
import {SpecialStateImageProcessor} from "./image_processing/SpecialStateImageProcessor";
import {CustomEvent} from "./datamodels/events/CustomEvent";
import {IDBClient} from "./db/IDBClient";
import {ConfigManager} from "./ConfigManager";

export class RequestHandler {
    dataRetrieval: IDBClient
    iCalClient: ICalClient

    constructor() {
        this.dataRetrieval = ConfigManager.instance.getDBClient()
        this.iCalClient = new ICalClient()
    }

    async getEWSClient(tenantID) {
        const tenant = this.dataRetrieval.getEwsUser(tenantID)
        return new EWSCalendarClient(await tenant)
    }

    async getAppointments(calendarDetails: IRoom): Promise<SimpleEvent[]> {
        if (calendarDetails.ews_info) {
            const ews_client = await this.getEWSClient(calendarDetails.ews_info.tenant_id)
            return ews_client.readUpcomingEventsToday(calendarDetails.ews_info.email)
        } else if (calendarDetails.ical_info){
            return this.iCalClient.readUpcomingEventsToday(calendarDetails.ical_info)
        } else if (calendarDetails.persons) {
            let appointments = await this.getPersonalStatus(calendarDetails.persons);
            appointments = appointments.reduce((accumulator, value) => accumulator.concat(value), []); // TODO sorting so upcoming event is first
            console.log(appointments)
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

    async getPersonalStatus(persons: IPerson[]) {
        let ews_client: EWSCalendarClient
        let freeBusyDetails: (CustomEvent|PersonalInfo)[] = []
        for (const person of persons as IPerson[]) {
            ews_client = await this.getEWSClient(person.ews_info.tenant_id)
            const custom_message = this.getCurrentCustomMessage(ews_client, person)
            if (await custom_message) {
                freeBusyDetails.push(await custom_message)
            } else {
                const busy_status = this.getCurrentStatusFromPerson(ews_client, person)
                freeBusyDetails.push(await busy_status)
            }
        }
        return freeBusyDetails
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

    async getCurrentStatusFromPerson(ewsClient: EWSCalendarClient, person: IPerson) {
        const result = await ewsClient.readPersonsAvailabilityToday([person.ews_info.email])
        const ooOResult = this.getOoOFromPerson(result[0])
        if (!ooOResult) {
            return this.getBusyFromPerson(result[0])
        } else {
            return ooOResult
        }
    }

    async getCurrentCustomMessage(ewsClient: EWSCalendarClient, person: IPerson) : Promise<CustomEvent> {
        const messagesToday = await ewsClient.readPersonsSpecificNotesToday(person.ews_info.email)
        if (messagesToday) {
            const messagesNow = messagesToday.filter((value) => value.happeningNow(ews.DateTime.Now))
            if (messagesNow.length > 0) {
                return messagesNow[0]
            }
        }
        return undefined
    }


    async getImage(device_id: string, voltage: number, png: boolean): Promise<any> {
        const calendarDetails = await this.dataRetrieval.getRoomForDevice(device_id)
        let image_processor

        if (!calendarDetails) {
            image_processor = new SpecialStateImageProcessor()
            await image_processor.buildNewDeviceImage(device_id, voltage)
            Logging.instance.logger.warn('IDevice-ID not found.', {devid: device_id});
            return image_processor.finalizeImage("new", png)
        }
        let ews_client: EWSCalendarClient
        if (calendarDetails.ews_info) {
            ews_client = await this.getEWSClient(calendarDetails.ews_info.tenant_id)
        }

         if (calendarDetails.persons) {
            let freeBusyDetails: (CustomEvent|PersonalInfo)[] = await this.getPersonalStatus(calendarDetails.persons)
            image_processor = new OfficeImageProcesor()
            await image_processor.buildImage(calendarDetails, freeBusyDetails, voltage)
        } else {
             if (voltage && voltage < (await this.dataRetrieval.getOrganization()).low_battery_voltage_cutoff_in_mv) {
                 Logging.instance.logger.warn('Low Battery!', {voltage: voltage, devid: device_id});
                 image_processor = new SpecialStateImageProcessor()
                 await image_processor.buildLowBatImage(calendarDetails, voltage)
             } else {
                 const appointments = this.getAppointments(calendarDetails)
                 image_processor = new BookableResourceImageProcessor()
                 await image_processor.buildImage(calendarDetails.name, calendarDetails.id_string, calendarDetails.id_string, calendarDetails.logo, await appointments, voltage)
             }
        }
        return await image_processor.finalizeImage(calendarDetails.id_string, png)
    }


    async getData(device_id: string): Promise<string> {
        const organization = await this.dataRetrieval.getOrganization()
        const device = await this.dataRetrieval.getDeviceFromHardwareID(device_id)
        let calendarDetails;
        if (isRoom(device.room_id)) {
            calendarDetails  = device.room_id

        } else {
            calendarDetails = await this.dataRetrieval.getRoomForDevice(device.room_id.toString())

        }

        if (!calendarDetails) return
        const appointments = await this.getAppointments(calendarDetails)

        const now = ews.DateTime.Now
        let calendarData: IInfoPacket = {
            current_time_string: "",
            current_time_unix: 0,
            hash: "",
            is_night: false,
            is_weekend: false,
            next_appointments: appointments,
            next_update_unix: 0,
            room_name: calendarDetails.name,
            room_number: calendarDetails.id_string
        };

        let next_update: moment.Moment = undefined


        if (appointments.length > 0) {
            if (appointments[0]) {
                if (appointments[0].happeningNow(now)) {
                    next_update = appointments[0].end
                } else {
                    next_update = appointments[0].start
                }
            }
        }

        if (next_update) {
            calendarData.next_update_unix = next_update.unix()
        }
        const hours_of_day = now.Hour
        if (hours_of_day >= organization.night_start_hour  || hours_of_day < (organization.night_end_hour-1)) {
            calendarData.is_night = true
        }
        const day_of_week = now.DayOfWeek
        if (day_of_week == DayOfWeek.Sunday || day_of_week == DayOfWeek.Saturday || (day_of_week == DayOfWeek.Friday && hours_of_day >= organization.night_start_hour)) {
            calendarData.is_weekend = true
        }
        if (calendarData.is_night) {
            let next_day = 0
            if (now.Hour >= organization.night_start_hour) next_day = 1 // Only move to next day if the request was sent before midnight, otherwise stay on the current day
            let updateTime = now.AddDays(next_day).MomentDate.startOf("day")
            updateTime.set("hour", organization.night_end_hour)
            calendarData.next_update_unix = updateTime.unix()
        } else if (calendarData.is_weekend) { // Its the weekend, but not the night
            if (appointments.length == 0) {
                let updateTime = now.AddDays(1).MomentDate.startOf("day")
                updateTime.set("hour", organization.night_end_hour)
                calendarData.next_update_unix = updateTime.unix()
            }
        }
        const hash_string = JSON.stringify(calendarData)
        calendarData.current_time_string = now.MomentDate.toISOString()
        calendarData.current_time_unix = now.MomentDate.unix()
        calendarData.next_appointments = undefined
        calendarData.hash = crypto.createHash('md5').update(hash_string).digest('hex');

        Logging.instance.logger.info("Data requested for: " + device_id)
        return JSON.stringify(calendarData)
    }

}