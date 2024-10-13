import fastify from 'fastify'
import {CalendarClient} from './calendar-api/ews';
import {ImageProcessor} from "./image_processing/imageprocessing"
import * as ews from "ews-javascript-api";
import * as crypto from "crypto";
import {DayOfWeek} from "ews-javascript-api/js/Enumerations/DayOfWeek";
import * as winston from "winston";
import {SimpleEvent} from "./datamodels/SimpleEvent";

const server = fastify()

const devices = require('./config/devices.json');
const calendars = require('./config/calendars.json');

process.env.TZ = 'Europe/Berlin'


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.simple()
    ),
    defaultMeta: {},
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});
logger.add(new winston.transports.Console({
    format: winston.format.simple(),
}));

function getCalendarIDFromDeviceID(devid: string) {
    for (const device of devices.devices) {
        if (device.device_id == devid) {
            return device.calendar_id
        }
    }
    return undefined
}

function getCalendarFromCalendarID(calendarID: string) {
    for (const calendar of calendars.calendars) {
        if (calendar.id == calendarID) {
            return calendar
        }
    }
    return undefined
}


['/occupancy', '/image'].forEach(path => {
    server.get(path, async (request, reply) => {
        const devid = request.query['devid']
        const calid = getCalendarIDFromDeviceID(devid)
        if (!calid) return 'Nein.'
        const calendarDetails = getCalendarFromCalendarID(calid)
        const email = calendarDetails.email
        const client = new CalendarClient()
        const appointments = await client.readUpcomingEventsToday(email)
        logger.info("Image requested for: " + devid)
        const image_processor = new ImageProcessor()
        const img = await image_processor.buildImage(calendarDetails.name, calendarDetails.id_string, calid, appointments)
        return img
    })
})

class CalendarData {
    current_time_string: string;
    current_time_unix: number;
    next_update_unix: number;
    room_name: string;
    room_number: string;
    hash: string;
    next_appointments: SimpleEvent[];
    is_night: boolean = false;
    is_weekend: boolean = false;
}

server.get("/data", async (request, reply) => {
    let calendarData: CalendarData = new CalendarData();

    const devid = request.query['devid']
    const calid = getCalendarIDFromDeviceID(devid)
    if (!calid) return 'Nein.'
    const calendarDetails = getCalendarFromCalendarID(calid)
    const email = calendarDetails.email
    const client = new CalendarClient()
    const appointments = await client.readUpcomingEventsToday(email)
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
    if (hours_of_day > 18 || hours_of_day < 7) {
        calendarData.is_night = true
    }
    const day_of_week = now.DayOfWeek
    if (day_of_week == DayOfWeek.Sunday || day_of_week == DayOfWeek.Saturday) {
        calendarData.is_weekend = true
    }
    if (calendarData.is_night) {
        let next_day = 0
        if (now.Hour > 18) next_day = 1 // Only move to next day if the request was sent before midnight, otherwise stay on the current day
        let updateTime = now.AddDays(next_day).MomentDate.startOf("day")
        updateTime.set("hour", 8)
        calendarData.next_update_unix = updateTime.unix()
    } else if (calendarData.is_weekend) { // Its the weekend, but not the night
        if (appointments.length == 0) {
            let updateTime = now.AddDays(1).MomentDate.startOf("day")
            updateTime.set("hour", 8)
            calendarData.next_update_unix = updateTime.unix()
        }
    }


    const hash_string = JSON.stringify(calendarData)
    calendarData.next_appointments = undefined
    calendarData.hash = crypto.createHash('md5').update(hash_string).digest('hex');
    calendarData.current_time_string = now.MomentDate.toISOString()
    calendarData.current_time_unix = now.MomentDate.unix()

    logger.info("Data requested for: " + devid)
    return JSON.stringify(calendarData)
})


server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
