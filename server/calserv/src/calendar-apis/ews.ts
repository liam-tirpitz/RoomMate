import {
    AttendeeAvailability,
    AttendeeInfo, CalendarEvent,
    ExchangeService, FolderId, FolderView, GetUserAvailabilityResults, LegacyFreeBusyStatus,
    Mailbox, SearchFilter, TimeWindow,
    WellKnownFolderName
} from "ews-javascript-api";
import * as dotenv from 'dotenv'
import * as ews from 'ews-javascript-api'
import {CalendarView} from "ews-javascript-api/js/Search/CalendarView";
import {SimpleEvent} from "../datamodels/SimpleEvent";
import * as config from '../../config/calendars.json'
import {PersonalInfo} from "../datamodels/PersonalInfo";
import * as utils from "../utils"

dotenv.config()


export class EWSCalendarClient {
    exch: ExchangeService;


    constructor() {
        this.exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2010);
        if (process.env.EXC_USER && process.env.EXC_PASS) {
            this.exch.Credentials = new ews.WebCredentials(process.env.EXC_USER, process.env.EXC_PASS);
            this.exch.Url = new ews.Uri(config.exchange.endpoint);
        } else {
            throw new Error('Missing Exchange Credentials!');
        }
    }

    getBusyStatusString(cEvent: CalendarEvent) {
        switch (cEvent.FreeBusyStatus) {
            case LegacyFreeBusyStatus.OOF:
                return "Out of Office"
            case LegacyFreeBusyStatus.Busy:
                return "Busy"
        }
    }


    async readUpcomingEventsToday(room_mail: string) {
        let now = ews.DateTime.Now
        const now_moment = now.MomentDate
        const eod_moment = now_moment.clone().endOf('day')
        let eod = new ews.DateTime(eod_moment)

        const view = new CalendarView(now, eod)
        const folderIdFromCalendar = new FolderId(WellKnownFolderName.Calendar, new Mailbox(room_mail));
        const appointments = this.exch.FindAppointments(folderIdFromCalendar, view)
        let events: SimpleEvent[] = [];
        for (let appointment of (await appointments).Items) {
            events.push(new SimpleEvent(appointment.Start.MomentDate, appointment.End.MomentDate, appointment.Subject, appointment.Organizer.Name, appointment.IsCancelled))
        }
        return events
    }

    async readPersonsAvailabilityToday(person_mails: string[]) {
        var attendee: AttendeeInfo[] =[ ];
        for (const mail of person_mails) {
            attendee.push(new ews.AttendeeInfo(mail))
        }

        var timeWindow: TimeWindow = new ews.TimeWindow(ews.DateTime.Now, ews.DateTime.Now.AddDays(1));
        // const id = new FolderId(WellKnownFolderName.Calendar, new Mailbox(person_mail));
        // const view = new FolderView(10)
        // const things = await this.exch.FindFolders(id, view)
        // console.log(things)
        let events: PersonalInfo[][] = [];

        const availabilityResponse: GetUserAvailabilityResults = await this.exch.GetUserAvailability(attendee, timeWindow, ews.AvailabilityData.FreeBusy)
        for (const response of availabilityResponse.AttendeesAvailability.Responses) {
            if (availabilityResponse.AttendeesAvailability.Count == 0) events.push([])
            let person_events: PersonalInfo[] = [];

            for (let cEvent of response.CalendarEvents) {
                const is_today = utils.isEventToday(cEvent.StartTime.MomentDate, cEvent.EndTime.MomentDate)
                if (is_today) {
                    person_events.push(new PersonalInfo(cEvent.StartTime.MomentDate, cEvent.EndTime.MomentDate, cEvent.FreeBusyStatus))
                }
            }
            events.push(person_events)
        }

        return events
    }

}