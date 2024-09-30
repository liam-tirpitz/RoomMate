import {CalendarEvent, GetUserAvailabilityResults} from "ews-javascript-api";
import * as dotenv from 'dotenv'
dotenv.config()

var ews = require('ews-javascript-api');
//create ExchangeService object
var exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2013);
exch.Credentials = new ews.WebCredentials(process.env.USER, process.env.PASS);
//set ews endpoint url to use
exch.Url = new ews.Uri("https://mail.rwth-aachen.de/EWS/Exchange.asmx"); // you can also use exch.AutodiscoverUrl

var attendee =[ new ews.AttendeeInfo("room-a@example.com")];
//create timewindow object o request avaiability suggestions for next 48 hours, DateTime and TimeSpan object is created to mimic portion of .net datetime/timespan object using momentjs
var timeWindow = new ews.TimeWindow(ews.DateTime.Now, ews.DateTime.Now.AddDays(2));
exch.GetUserAvailability(attendee, timeWindow, ews.AvailabilityData.FreeBusyAndSuggestions)
    .then(function (availabilityResponse: GetUserAvailabilityResults) {
        const responses = availabilityResponse.AttendeesAvailability.Responses.at(0)
        for (let cEvent: CalendarEvent of responses.CalendarEvents) {
            console.log(cEvent)
        }
    }, function (errors:any) {
        //log errors or do something with errors
    });