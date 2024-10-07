import {
    AttendeeAvailability,
    AttendeeInfo, CalendarEvent,
    ExchangeService, FolderId, FolderView, GetUserAvailabilityResults,
    Mailbox, SearchFilter, TimeWindow,
    WellKnownFolderName
} from "ews-javascript-api";
import * as dotenv from 'dotenv'
import * as ews from 'ews-javascript-api'
import {CalendarView} from "ews-javascript-api/js/Search/CalendarView";
import {SimpleEvent} from "../datamodels/SimpleEvent";
dotenv.config()


export class CalendarClient {
    exch: ExchangeService;
    config: any;


    constructor() {
        this.config = require('../config/calendars.json');
        this.exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2010);
        if (process.env.EXC_USER && process.env.EXC_PASS) {
            this.exch.Credentials = new ews.WebCredentials(process.env.EXC_USER, process.env.EXC_PASS);
            this.exch.Url = new ews.Uri(this.config.exchange.endpoint);
        } else {
            throw new Error('Missing Exchange Credentials!');
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

    async readPersonalStuff(person_mail) {
        var attendee: AttendeeInfo[] =[ new ews.AttendeeInfo(person_mail)];
        var timeWindow: TimeWindow = new ews.TimeWindow(ews.DateTime.Now, ews.DateTime.Now.AddDays(2));
        const id = new FolderId(WellKnownFolderName.Calendar, new Mailbox(person_mail));
        const view = new FolderView(10)
        const things = await this.exch.FindFolders(id, view)
        console.log(things)

        this.exch.GetUserAvailability(attendee, timeWindow, ews.AvailabilityData.FreeBusyAndSuggestions)
            .then(function (availabilityResponse: GetUserAvailabilityResults) {
                const responses:AttendeeAvailability = availabilityResponse.AttendeesAvailability.Responses.at(0)
                for (let cEvent of responses.CalendarEvents) {
                    console.log(cEvent)
                }
            }, function (errors:any) {
                //log errors or do something with errors
            });
    }

}