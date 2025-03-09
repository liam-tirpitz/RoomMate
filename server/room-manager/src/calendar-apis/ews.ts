import * as ews from "ews-javascript-api";
import * as jsdom from "jsdom"

import {
    AttendeeInfo,
    BodyType,
    ExchangeService,
    FolderId,
    FolderView,
    GetUserAvailabilityResults,
    Mailbox,
    MessageBody,
    PropertySet,
    ServiceResponseException,
    TimeWindow,
    WellKnownFolderName
} from "ews-javascript-api";
import * as dotenv from 'dotenv'
import {CalendarView} from "ews-javascript-api/js/Search/CalendarView";
import {SimpleEvent} from "../datamodels/events/SimpleEvent";
import {PersonalInfo} from "../datamodels/events/PersonalInfo";
import * as utils from "../utils"
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {Logging} from "../logging";
import {CustomEvent} from "../datamodels/events/CustomEvent";

dotenv.config()


export class EWSCalendarClient {
    exch: ExchangeService;


    constructor(tenant: IEWSTenant) {
        this.exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2010);
        const password = process.env[tenant.secret]
        if (password) {
            this.exch.Credentials = new ews.WebCredentials(tenant.user, password);
            this.exch.Url = new ews.Uri(tenant.endpoint);
        } else {
            throw new Error('Missing Exchange Credentials!');
        }
    }

    async getUpcomingAppointmentToday(folderId: FolderId) {
        let now = ews.DateTime.Now
        const now_moment = now.MomentDate
        const eod_moment = now_moment.clone().endOf('day')
        let eod = new ews.DateTime(eod_moment)
        const view = new CalendarView(now, eod)
        return this.exch.FindAppointments(folderId, view)
    }

    async readUpcomingEventsToday(room_mail: string) {
        const folderIdFromCalendar = new FolderId(WellKnownFolderName.Calendar, new Mailbox(room_mail));
        const appointments = this.getUpcomingAppointmentToday(folderIdFromCalendar)
        let events: SimpleEvent[] = [];
        for (let appointment of (await appointments).Items) {
            events.push(new SimpleEvent(appointment.Start.MomentDate, appointment.End.MomentDate, appointment.Subject, appointment.Organizer.Name, appointment.IsCancelled, appointment.IsAllDayEvent))
        }
        return events
    }

    disassemble_body(body: MessageBody): string[] {
        let result = []
        if (body.BodyType == BodyType.HTML) {
            const input = body.Text
            const dom = new jsdom.JSDOM(input)
            for (const element of dom.window.document.getElementsByTagName("p")) {
                const lines = element.textContent.split("\n")
                if (lines.length > 0) {
                    if (lines[lines.length -1] === "") {
                        lines.pop()
                    }
                    result.push(...lines)
                }
            }
            return result
        } else {
            return body.Text.split("\n")
        }
    }


    async readPersonsSpecificNotesToday(person_mail: string): Promise<CustomEvent[]> {
        const customEvents: CustomEvent[] = []
        const folderIdFromCalendar = new FolderId(WellKnownFolderName.Calendar, new Mailbox(person_mail));
        try {
            const result = this.exch.FindFolders(folderIdFromCalendar, new FolderView(30))
            let calendars = (await result).Folders
            calendars = calendars.filter(value => value.DisplayName == "SIGN")
            if (calendars.length != 0) {
                const calendar = calendars[0]
                const appointments = await this.getUpcomingAppointmentToday(calendar.Id)
                await this.exch.LoadPropertiesForItems(appointments.Items, PropertySet.FirstClassProperties)
                for (const appointment of (await appointments).Items) {
                    const customEvent = new CustomEvent(
                        appointment.Start.MomentDate,
                        appointment.End.MomentDate,
                        appointment.Subject,
                        appointment.Organizer.Name,
                        appointment.IsCancelled,
                        appointment.IsAllDayEvent,
                        this.disassemble_body(appointment.Body))
                    customEvents.push(customEvent)
                }

                return customEvents
            } else {
                return []
            }
        } catch (e) {
            if (e instanceof ServiceResponseException) {
                if (e.ErrorCode == 108) {
                    Logging.instance.logger.warn("Cannot access calendar for " + person_mail)
                    return []
                }
            }
        }
        return
    }

    async readPersonsAvailabilityToday(person_mails: string[]) {
        var attendee: AttendeeInfo[] =[ ];
        for (const mail of person_mails) {
            attendee.push(new ews.AttendeeInfo(mail))
        }

        var timeWindow: TimeWindow = new ews.TimeWindow(ews.DateTime.Now, ews.DateTime.Now.AddDays(1));
        let events: PersonalInfo[][] = [];

        const availabilityResponse: GetUserAvailabilityResults = await this.exch.GetUserAvailability(attendee, timeWindow, ews.AvailabilityData.FreeBusy)
        for (const response of availabilityResponse.AttendeesAvailability.Responses) {
            if (availabilityResponse.AttendeesAvailability.Count === 0) events.push([])
            let person_events: PersonalInfo[] = [];

            for (let cEvent of response.CalendarEvents) {
                const is_today = utils.isEventToday(cEvent.StartTime.MomentDate, cEvent.EndTime.MomentDate)
                const has_passed = utils.hasEventPassed(cEvent.EndTime.MomentDate)
                if (is_today && !has_passed) {
                    person_events.push(new PersonalInfo(cEvent.StartTime.MomentDate, cEvent.EndTime.MomentDate, cEvent.FreeBusyStatus))
                }
            }
            events.push(person_events)
        }

        return events
    }

}