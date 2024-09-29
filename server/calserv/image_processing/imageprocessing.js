import SimpleEvent from "../datamodels/eventmodels.js"

import {registerFont, createCanvas, loadImage } from 'canvas'
import fs from 'fs'


async function drawCurrentEventTime(ctx, timestring, black_font = false) {
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    if (black_font) {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
    }
    ctx.font = '18pt "HNB"'
    ctx.fillText(timestring, 32, 242)
}

async function drawCurrentEventBlackBox(ctx) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 106, 480, 169);
}

async function drawCurrentEventWhiteBox(ctx) {
    ctx.lineWidth = 2;
    ctx.beginPath()
    ctx.strokeStyle = 'black';
    ctx.strokeRect(-2, 106, 482, 169);
    ctx.closePath()
}

async function drawCurrentEventInfo(ctx, info, black_font = false) {
    ctx.font = '42pt "HNB"'
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    if (black_font) {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
    }
    ctx.fillText(info, 32, 202)
}

async function drawOccupied(ctx, summary, organizer, timestring) {
    await drawCurrentEventBlackBox(ctx)
    ctx.font = '18pt "HNB"'
    ctx.fillStyle = "rgba(255, 255, 255, 1";
    ctx.fillText(summary, 32, 160)
    ctx.font = '18pt "HNL"'
    ctx.fillText(organizer, 32, 186)
    await drawCurrentEventTime(ctx, timestring, false)
}

async function drawOccupiedUnknown(ctx, end) {
    await drawCurrentEventBlackBox(ctx)
    await drawCurrentEventInfo(ctx, "Booked", false)
    await drawCurrentEventTime(ctx, "Until " + end, false)
}

async function drawFreeUntil(ctx, end) {
    await drawCurrentEventWhiteBox(ctx)
    await drawCurrentEventInfo(ctx, "Available", true)
    await drawCurrentEventTime(ctx, "Until " + end, true)
}

async function drawOpccupiedSoon(ctx, start) {
    await drawCurrentEventWhiteBox(ctx)
    await drawCurrentEventInfo(ctx, "Next Meeting", true)
    await drawCurrentEventTime(ctx, "Starts soon - " + start, true)
}

async function drawHeader(ctx, room_name, room_number) {
    const img = await loadImage('template.png')
    ctx.drawImage(img, 0, 0)

    ctx.font = '21pt "HNB"'
    ctx.fillText(room_name, 248, 62)

    ctx.font = '15pt "HNB"'
    ctx.fillText(room_number, 248, 83)
}

async function setupCanvas() {
    registerFont('fonts/HelveticaNeueLTCom-Bd.ttf', { family: 'HNB' })
    registerFont('fonts/HelveticaNeueLTCom-Lt.ttf', { family: 'HNL' })
    return createCanvas(480, 800)
}


function getTimeStringFromDate(date) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

async function drawCurrentEvent(ctx, event) {
    const now = new Date();
    console.log(now, event.start)
    if (event.start <= now && now <= event.end) {
        if (event.summary) {
            await drawOccupied(ctx, event.summary, event.organizer, getTimeStringFromDate(event.start) + " - " + getTimeStringFromDate(event.end))
        } else {
            await drawOccupiedUnknown(ctx, getTimeStringFromDate(event.end))
        }
    } else if (now < event.start && (event.start - now) < 15 * 60 * 1000) {
        await drawOpccupiedSoon(ctx, getTimeStringFromDate(event.start))
    } else if (now < event.start) {
        await drawFreeUntil(ctx, getTimeStringFromDate(event.start))
    } else {
        console.log("No current event to draw?")
    }

}

async function doImageThings() {
    const canvas = await setupCanvas()
    const ctx = canvas.getContext('2d')

    await drawHeader(ctx, 'Meeting Room', '1000.0')

    const start = new Date(Date.parse("2024-09-29T13:12:00"));
    const end = new Date(Date.parse('2024-09-29T15:00:00'));

    const event = new SimpleEvent(start, end, "[IDB] Status Meeting with HiWis", "Liam Tirpitz")
    await drawCurrentEvent(ctx, event)

    const out = fs.createWriteStream( 'out.png')
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () =>  console.log('The PNG file was created.'))
}

doImageThings().then()