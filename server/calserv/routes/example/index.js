'use strict'

const ical = require("node-ical");

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    var config = require('../../config/calendars.json');
    let endpoint = config.calendars[0].endpoint
    console.log(endpoint)
    const data = await getCalendar(endpoint)
    for (let k in data) {
      const event = data[k];
      console.log(event.type)
    }
    return data
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

