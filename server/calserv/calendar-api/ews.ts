import {
    AttendeeAvailability,
    AttendeeInfo,
    CalendarEvent,
    ExchangeService, FolderId,
    GetUserAvailabilityResults, Mailbox,
    TimeWindow, WellKnownFolderName
} from "ews-javascript-api";
import * as dotenv from 'dotenv'
import * as ews from 'ews-javascript-api'
import {CalendarView} from "ews-javascript-api/js/Search/CalendarView";
import {FindItemsResults} from "ews-javascript-api/js/Search/FindItemsResults";
import {Appointment} from "ews-javascript-api/js/Core/ServiceObjects/Items/Appointment";
dotenv.config()


export class CalendarClient {
    exch: ExchangeService;
    config: any;


    constructor() {
        this.config = require('../config/calendars.json');
        this.exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2010);
        if (process.env.PASS && process.env.USER) {
            this.exch.Credentials = new ews.WebCredentials(process.env.USER, process.env.PASS);
            this.exch.Url = new ews.Uri(this.config.exchange.endpoint);
        } else {
            throw new Error('Missing Exchange Credentials!');
        }
    }

    async readUpcomingEventsToday(room_mail: string) {
        const attendee: AttendeeInfo = new ews.AttendeeInfo(room_mail);
        let now = ews.DateTime.Now
        const now_moment = now.MomentDate
        const eod_moment = now_moment.clone().endOf('day')
        let eod = new ews.DateTime(eod_moment)



        const view = new CalendarView(now, eod)
        const folderIdFromCalendar = new FolderId(WellKnownFolderName.Calendar, new Mailbox(room_mail));
        const appointments = this.exch.FindAppointments(folderIdFromCalendar, view)
        for (let appointment of (await appointments).Items) {
            // console.log(appointment)
            console.log(appointment.Organizer.Name)
            console.log(appointment.Subject)
            console.log(appointment.Start.toString())
            console.log(appointment.End.toString())
        }
        return appointments
    }

}

// const client = new CalendarClient()
// client.readUpcomingEventsToday("room-a@example.com").then()