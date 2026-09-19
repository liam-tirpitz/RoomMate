import {afterEach, beforeEach, describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import {ICalClient} from "../src/calendar-apis/ical";

// Noon local time, so all test events are on the same day in any timezone
const NOW = new Date(2026, 8, 16, 12, 0, 0)

function at(hour: number, minute: number = 0): Date {
    return new Date(2026, 8, 16, hour, minute, 0)
}

function vevent(summary: string, start: Date, end: Date) {
    return {type: "VEVENT", summary: summary, description: "", start: start, end: end}
}

describe("ICalClient.readUpcomingEventsToday", () => {
    beforeEach(() => mock.timers.enable({apis: ["Date"], now: NOW}))
    afterEach(() => mock.timers.reset())

    it("drops events that already ended and sorts the rest by start", async () => {
        const client = new ICalClient()
        client.getCalendar = async () => ({
            future: vevent("Future", at(15), at(16)),
            past: vevent("Past", at(9), at(10)),
            current: vevent("Current", at(11, 30), at(12, 30)),
            tomorrow: vevent("Tomorrow", new Date(2026, 8, 17, 9), new Date(2026, 8, 17, 10)),
            timezone: {type: "VTIMEZONE"},
        })

        const events = await client.readUpcomingEventsToday({endpoint: "https://calendar.example.com/room.ics"})

        assert.deepEqual(events.map(event => event.summary), ["Current", "Future"])
    })

    it("drops an event that ends right now", async () => {
        const client = new ICalClient()
        client.getCalendar = async () => ({
            ending: vevent("Ending", at(11), at(12)),
        })

        const events = await client.readUpcomingEventsToday({endpoint: "https://calendar.example.com/room.ics"})

        assert.deepEqual(events, [])
    })
})
