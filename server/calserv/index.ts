import fastify from 'fastify'
import {CalendarClient} from './calendar-api/ews';
import {ImageProcessor} from "./image_processing/imageprocessing"
import * as ews from "ews-javascript-api";
import {SimpleEvent} from "./datamodels/SimpleEvent";
import * as hasher from "node-object-hash"

const server = fastify()

const devices = require('./config/devices.json');
const calendars = require('./config/calendars.json');

process.env.TZ = 'Europe/Berlin'

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

        const image_processor = new ImageProcessor()
        const img = await image_processor.buildImage(calendarDetails.name, calendarDetails.id_string, calid, appointments)
        return img
    })
})

class CalendarData {
    current_time: string;
    next_update: string;
    room_name: string;
    room_number: string;
    hash: string;
    next_appointments: SimpleEvent[];
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
    if(next_update) {
        calendarData.next_update = next_update.toISOString()
    } else {
        calendarData.next_update = ""
    }

    calendarData.hash = hasher.hasher({ sort: true, coerce: true, alg: 'md5' }).hash(calendarData.hash)
    calendarData.current_time = now.MomentDate.toISOString()

    return JSON.stringify(calendarData)
})


server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
