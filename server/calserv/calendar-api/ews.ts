import {
    ExchangeService, FolderId,
    Mailbox,
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
            // console.log(appointment.Organizer.Name)
            // console.log(appointment.Subject)
            // console.log(appointment.Start)
            // console.log(appointment.End)
            // console.log(appointment.IsCancelled)

            events.push(new SimpleEvent(appointment.Start.MomentDate, appointment.End.MomentDate, appointment.Subject, appointment.Organizer.Name, appointment.IsCancelled))
        }
        return events
    }

}