import {SimpleEvent} from "../../datamodels/SimpleEvent"

'use strict'

const ical = require("node-ical");
const moment = require('moment-timezone');



function getSimpleEvent(complexEvent) {
  return new SimpleEvent(
      complexEvent.start,
      complexEvent.end,
      complexEvent.summary);
}

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    var config = require('../../config/calendars.json');
    let endpoint = config.calendars[0].endpoint
    console.log(endpoint)
    const data = await getCalendar(endpoint)
    var currentTime = new Date(Date.now());
    let endTime = new Date(Date.now() + 24 * (60 * 60 * 1000) );

    for (let k in data) {
      const event = data[k];

      if (event.type === "VEVENT") {

        if (event.rrule) {
          parseRecurrences(event, currentTime, endTime)
        }
        if (event.start.getTime() <= currentTime.getTime() && currentTime.getTime() <= event.end.getTime()) {
          console.log("Occupied!");
          console.log(getSimpleEvent(event));
        } else if (endTime >= event.start.getTime() && event.start.getTime() >= currentTime.getTime()) {
          console.log("Event soon!");
          console.log(getSimpleEvent(event))
        }
      }
    }
    return data
  })
}

function parseRecurrences(event, start_time, end_time) {
  const dates = event.rrule.between(start_time, end_time)
  console.log(dates)
  if (dates.length === 0) return;

  console.log('Summary:', event.summary);
  console.log('Original start:', event.start);
  console.log('RRule start:', `${event.rrule.origOptions.dtstart} [${event.rrule.origOptions.tzid}]`)

  dates.forEach(date => {
    let newDate
    if (event.rrule.origOptions.tzid) {
      // tzid present (calculate offset from recurrence start)
      const dateTimezone = moment.tz.zone('UTC')
      const localTimezone = moment.tz.guess()
      const tz = event.rrule.origOptions.tzid === localTimezone ? event.rrule.origOptions.tzid : localTimezone
      const timezone = moment.tz.zone(tz)
      const offset = timezone.utcOffset(date) - dateTimezone.utcOffset(date)
      newDate = moment(date).add(offset, 'minutes').toDate()
    } else {
      // tzid not present (calculate offset from original start)
      newDate = new Date(date.setHours(date.getHours() - ((event.start.getTimezoneOffset() - date.getTimezoneOffset()) / 60)))
    }
    const start = moment(newDate)
    const simple_event = new SimpleEvent(newDate, newDate, event.summary); // TODO EndTime?
    console.log('SimpleEvent:', simple_event)
  })

}

function parseEvent(ev) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${ev.summary} is in ${ev.location} on the ${ev.start.getDate()} of ${months[ev.start.getMonth()]} at ${ev.start.toLocaleTimeString('en-GB')}\r\n`;
}

async function getCalendar(endpoint){
  const ical = require('node-ical');
  return ical.async.fromURL(endpoint);
}

