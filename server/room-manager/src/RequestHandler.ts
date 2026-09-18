import {EWSCalendarClient} from "./calendar-apis/ews";
import {Logging} from "./logging";
import {BookableResourceImageProcessor} from "./image_processing/BookableResourceImageProcessor";
import * as ews from "ews-javascript-api";
import {LegacyFreeBusyStatus} from "ews-javascript-api";
import {DayOfWeek} from "ews-javascript-api/js/Enumerations/DayOfWeek";
import crypto from "crypto";
import moment from "moment-timezone";
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
import {IRenderedScreen} from "./image_processing/ImageProcessor";
import {IOrganization} from "../../datamodels/IOrganization";

// A device reporting its voltage more often than this adds no battery sample
const BATTERY_SAMPLE_INTERVAL_MIN = 10
const DEFAULT_OFFLINE_AFTER_MIN = 120
// The firmware sends its MAC without colons, in the case the ESP32 reports it
const DEVICE_ID_PATTERN = /^[0-9a-fA-F]{12}$/

export interface IImageOptions {
    // false renders without recording anything: no stored screen, redraw request kept (API previews)
    persist?: boolean
}

export class RequestHandler {
    iCalClient: ICalClient
    private _dataRetrieval: IDBClient

    constructor() {
        this.iCalClient = new ICalClient()
    }

    // Follows ConfigManager unless replaced (tests)
    get dataRetrieval(): IDBClient {
        return this._dataRetrieval ?? ConfigManager.instance.getDBClient()
    }

    set dataRetrieval(client: IDBClient) {
        this._dataRetrieval = client
    }

    // Called for every /data and /image request before anything else, so unknown devices show up in the UI.
    // Telemetry must never keep a sign from getting its data, so failures are only logged.
    async recordContact(device_id: string, voltage?: number): Promise<void> {
        // Anything else is not a RoomMate and must not show up as an unconfigured device
        if (!DEVICE_ID_PATTERN.test(device_id ?? "")) return
        try {
            const now = new Date()
            await this.dataRetrieval.touchDevice(device_id, {last_contact: now.toISOString(), battery_mv: voltage || undefined})
            if (voltage > 0) {
                const since = new Date(now.getTime() - BATTERY_SAMPLE_INTERVAL_MIN * 60_000).toISOString()
                const recent = await this.dataRetrieval.getBatteryHistory(device_id, since, now.toISOString())
                if (!recent.length) {
                    await this.dataRetrieval.addBatterySample(device_id, voltage, now.toISOString())
                }
            }
        } catch (error) {
            Logging.instance.logger.error("Could not record the device contact", {devid: device_id, error: error.message})
        }
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
            value.freeBusyStatus == LegacyFreeBusyStatus.OOF && utils.isEventNow(value.start, value.end))
        result.sort((a,b) => b.end.valueOf() - a.end.valueOf())
        if (result.length > 0) {
            return result[0]
        } else {
            return
        }
    }

    async getPersonalStatus(persons: IPerson[]) {
        return (await this.getPersonalStatusWithNextChange(persons)).statuses
    }

    // Returns the currently displayed status per person (undefined if there is none) and the earliest
    // upcoming point in time at which one of the displayed statuses may change.
    async getPersonalStatusWithNextChange(persons: IPerson[]): Promise<{statuses: (CustomEvent|PersonalInfo)[], nextChange: moment.Moment}> {
        let ews_client: EWSCalendarClient
        let freeBusyDetails: (CustomEvent|PersonalInfo)[] = []
        let relevantEvents: SimpleEvent[] = []
        for (const person of persons as IPerson[]) {
            ews_client = await this.getEWSClient(person.ews_info.tenant_id)
            const messagesToday = (await ews_client.readPersonsSpecificNotesToday(person.ews_info.email)) ?? []
            relevantEvents.push(...messagesToday)
            const custom_message = messagesToday.find((value) => value.happeningNow(ews.DateTime.Now))
            if (custom_message) {
                freeBusyDetails.push(custom_message)
            } else {
                const availability = (await ews_client.readPersonsAvailabilityToday([person.ews_info.email]))[0] ?? []
                relevantEvents.push(...availability.filter(value => this.isDisplayedFreeBusyStatus(value.freeBusyStatus)))
                freeBusyDetails.push(this.getOoOFromPerson(availability) ?? this.getBusyFromPerson(availability))
            }
        }
        return {statuses: freeBusyDetails, nextChange: this.getNextChange(relevantEvents)}
    }

    isDisplayedFreeBusyStatus(status: LegacyFreeBusyStatus): boolean {
        return status == LegacyFreeBusyStatus.OOF
            || status == LegacyFreeBusyStatus.Busy
            || status == LegacyFreeBusyStatus.WorkingElsewhere
    }

    getNextChange(events: SimpleEvent[]): moment.Moment {
        const now = ews.DateTime.Now.valueOf()
        // Changes after today are picked up by the regular, night and weekend wakeups. Returning them here would
        // let the device sleep through the weekend until e.g. the end of a multi-day out-of-office entry.
        const end_of_today = moment().endOf('day').valueOf()
        const boundaries = events
            .reduce((accumulator, event) => accumulator.concat([event.start, event.end]), [] as moment.Moment[])
            .filter(boundary => boundary.valueOf() > now && boundary.valueOf() <= end_of_today)
        boundaries.sort((a, b) => a.valueOf() - b.valueOf())
        return boundaries[0]
    }

    getBusyFromPerson(infos : PersonalInfo[]): PersonalInfo {
        const result = infos.filter(value =>
            (value.freeBusyStatus == LegacyFreeBusyStatus.Busy || value.freeBusyStatus == LegacyFreeBusyStatus.WorkingElsewhere)
            && utils.isEventNow(value.start, value.end))
        // Prefer an actual meeting over working elsewhere, then the status that lasts the longest
        result.sort((a,b) =>
            Number(b.freeBusyStatus == LegacyFreeBusyStatus.Busy) - Number(a.freeBusyStatus == LegacyFreeBusyStatus.Busy)
            || b.end.valueOf() - a.end.valueOf())
        if (result.length > 0) {
            return result[0]
        } else {
            return
        }
    }


    // Returns the packed base64 string for the device, or the PNG buffer when png is set
    async getImage(device_id: string, voltage: number, png: boolean, options: IImageOptions = {}): Promise<string | Buffer> {
        const screen = await this.renderScreen(device_id, voltage)
        if (options.persist ?? true) {
            try {
                await this.dataRetrieval.saveScreen(device_id, screen.png, null)
                await this.dataRetrieval.setRedrawRequested(device_id, false)
            } catch (error) {
                Logging.instance.logger.error("Could not store the rendered screen", {devid: device_id, error: error.message})
            }
        }
        return png ? screen.png : screen.packed
    }

    private async renderScreen(device_id: string, voltage: number): Promise<IRenderedScreen> {
        const calendarDetails = await this.dataRetrieval.getRoomForDevice(device_id)
        let image_processor

        if (!calendarDetails) {
            image_processor = new SpecialStateImageProcessor()
            await image_processor.buildNewDeviceImage(device_id, voltage)
            Logging.instance.logger.warn('IDevice-ID not found.', {devid: device_id});
            return image_processor.finalizeImage()
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
        return await image_processor.finalizeImage()
    }


    async getData(device_id: string): Promise<string | null> {
        const organization = await this.dataRetrieval.getOrganization()
        const device = await this.dataRetrieval.getDeviceFromHardwareID(device_id)
        if (!device) return null
        // The file backend embeds the room in the device, the SQLite backend only references it
        const calendarDetails = isRoom(device.room_id) ? device.room_id : await this.dataRetrieval.getRoomForDevice(device_id)

        if (!calendarDetails) return null
        let appointments: SimpleEvent[]
        let next_update: moment.Moment = undefined
        if (calendarDetails.persons) {
            const personalStatus = await this.getPersonalStatusWithNextChange(calendarDetails.persons)
            appointments = personalStatus.statuses
            next_update = personalStatus.nextChange
        } else {
            appointments = await this.getAppointments(calendarDetails)
        }

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

        if (!calendarDetails.persons && appointments.length > 0) {
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
            // Nothing changes on the screen today, so sleep until the next morning. Devices are told to
            // sleep until next_update_unix on weekends, so this must never stay at 0.
            if (!next_update) {
                let updateTime = now.AddDays(1).MomentDate.startOf("day")
                updateTime.set("hour", organization.night_end_hour)
                calendarData.next_update_unix = updateTime.unix()
            }
        }
        // For offices, the next change is not visible on the screen and must not trigger a redraw on its own.
        // The footer shows the date, so it has to change the hash once per day.
        // A redraw requested in the UI changes the hash until the device has fetched the new image
        const hash_string = JSON.stringify({
            ...calendarData,
            next_update_unix: calendarDetails.persons ? 0 : calendarData.next_update_unix,
            footer_date: utils.getDateStringFromDate(now.MomentDate.toDate()),
            redraw_nonce: device.redraw_requested ? now.MomentDate.valueOf() : undefined,
        })
        calendarData.current_time_string = now.MomentDate.toISOString()
        calendarData.current_time_unix = now.MomentDate.unix()
        calendarData.next_appointments = undefined
        calendarData.hash = crypto.createHash('md5').update(hash_string).digest('hex');

        await this.recordNextContact(device_id, calendarData.next_update_unix, organization)
        Logging.instance.logger.info("Data requested for: " + device_id)
        return JSON.stringify(calendarData)
    }

    // The device sleeps until next_update_unix if it lies ahead, otherwise for its own interval,
    // which the server does not know; then expect it within device_offline_after_min
    private async recordNextContact(device_id: string, next_update_unix: number, organization: IOrganization) {
        const now = Date.now()
        const next = next_update_unix * 1000 > now
            ? next_update_unix * 1000
            : now + (organization.device_offline_after_min ?? DEFAULT_OFFLINE_AFTER_MIN) * 60_000
        try {
            await this.dataRetrieval.touchDevice(device_id, {last_contact: new Date(now).toISOString(), next_expected_contact: new Date(next).toISOString()})
        } catch (error) {
            Logging.instance.logger.error("Could not record the next expected contact", {devid: device_id, error: error.message})
        }
    }
}
