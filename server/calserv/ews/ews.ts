import {
    AttendeeAvailability,
    AttendeeInfo,
    CalendarEvent,
    ExchangeService,
    GetUserAvailabilityResults,
    TimeWindow
} from "ews-javascript-api";
import * as dotenv from 'dotenv'
import * as ews from 'ews-javascript-api'
dotenv.config()
var config = require('../config/calendars.json');

var exch: ExchangeService = new ews.ExchangeService(ews.ExchangeVersion.Exchange2010);
exch.Credentials = new ews.WebCredentials(process.env.USER, process.env.PASS);
exch.Url = new ews.Uri(config.exchange.endpoint);

var attendee: AttendeeInfo[] =[ new ews.AttendeeInfo("room-a@example.com")];
var timeWindow: TimeWindow = new ews.TimeWindow(ews.DateTime.Now, ews.DateTime.Now.AddDays(2));

exch.GetUserAvailability(attendee, timeWindow, ews.AvailabilityData.FreeBusyAndSuggestions)
    .then(function (availabilityResponse: GetUserAvailabilityResults) {
        const responses:AttendeeAvailability = availabilityResponse.AttendeesAvailability.Responses.at(0)
        for (let cEvent: CalendarEvent of responses.CalendarEvents) {
            console.log(cEvent)
        }
    }, function (errors:any) {
        //log errors or do something with errors
    });