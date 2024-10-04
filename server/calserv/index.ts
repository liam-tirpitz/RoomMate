import fastify from 'fastify'
import {CalendarClient} from './calendar-api/ews';
import {ImageProcessor} from "./image_processing/imageprocessing"

const server = fastify()

const devices = require('./config/devices.json');
const calendars = require('./config/calendars.json');

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

server.get("/data", async (request, reply) => {
    const devid = request.query['devid']
    const calid = getCalendarIDFromDeviceID(devid)
    if (!calid) return 'Nein.'
    const calendarDetails = getCalendarFromCalendarID(calid)
    const email = calendarDetails.email
    const client = new CalendarClient()
    const appointments = await client.readUpcomingEventsToday(email)

    return JSON.stringify(appointments)
})


server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
