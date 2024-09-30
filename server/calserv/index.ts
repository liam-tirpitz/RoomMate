import fastify from 'fastify'
import {CalendarClient} from "./calendar-api/ews";

const server = fastify()

server.get('/occupancy', async (request, reply) => {
    const client = new CalendarClient()
    const appointments = await client.readUpcomingEventsToday("room-a@example.com").then()
    return JSON.stringify(appointments)
})

server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
