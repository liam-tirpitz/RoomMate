import {SimpleEvent} from "../datamodels/SimpleEvent"

import {registerFont, createCanvas, loadImage, CanvasRenderingContext2D, Canvas, Image} from 'canvas'
import * as fs from 'fs';

function drawCurrentEventTime(ctx: CanvasRenderingContext2D, timestring: string, black_font: boolean = false) {
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    if (black_font) {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
    }
    ctx.font = '18pt "HNB"'
    ctx.fillText(timestring, 32, 242)
}

function drawCurrentEventBlackBox(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 106, 480, 169);
}

function drawCurrentEventWhiteBox(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 2;
    ctx.beginPath()
    ctx.strokeStyle = 'black';
    ctx.strokeRect(-2, 106, 482, 169);
    ctx.closePath()
}

function drawCurrentEventInfo(ctx: CanvasRenderingContext2D, info: string, black_font: boolean = false) {
    ctx.font = '42pt "HNB"'
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    if (black_font) {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
    }
    ctx.fillText(info, 32, 202)
}

function drawOccupied(ctx: CanvasRenderingContext2D, summary: string, organizer: string, timestring: string) {
    drawCurrentEventBlackBox(ctx)
    ctx.font = '18pt "HNB"'
    ctx.fillStyle = "rgba(255, 255, 255, 1";
    ctx.fillText(summary, 32, 160)
    ctx.font = '18pt "HNL"'
    ctx.fillText(organizer, 32, 186)
    drawCurrentEventTime(ctx, timestring, false)
}

function drawOccupiedUnknown(ctx: CanvasRenderingContext2D, end: string) {
    drawCurrentEventBlackBox(ctx)
    drawCurrentEventInfo(ctx, "Booked", false)
    drawCurrentEventTime(ctx, "Until " + end, false)
}

function drawFreeUntil(ctx: CanvasRenderingContext2D, end: string) {
    drawCurrentEventWhiteBox(ctx)
    drawCurrentEventInfo(ctx, "Available", true)
    drawCurrentEventTime(ctx, "Until " + end, true)
}

function drawOpccupiedSoon(ctx: CanvasRenderingContext2D, start: string) {
    drawCurrentEventWhiteBox(ctx)
    drawCurrentEventInfo(ctx, "Next Meeting", true)
    drawCurrentEventTime(ctx, "Starts soon - " + start, true)
}

function drawHeader(ctx: CanvasRenderingContext2D, img: Image, room_name: string, room_number: string) {
    ctx.drawImage(img, 0, 0)

    ctx.font = '21pt "HNB"'
    ctx.fillText(room_name, 248, 62)

    ctx.font = '15pt "HNB"'
    ctx.fillText(room_number, 248, 83)
}

function setupCanvas(): Canvas {
    registerFont('image_processing/fonts/HelveticaNeueLTCom-Bd.ttf', { family: 'HNB' })
    registerFont('image_processing/fonts/HelveticaNeueLTCom-Lt.ttf', { family: 'HNL' })
    return createCanvas(480, 800)
}


function getTimeStringFromDate(date: Date) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

function drawCurrentEvent(ctx:CanvasRenderingContext2D, event: SimpleEvent) {
    const now: Date = new Date();
    console.log(now, event.start)
    if (event.start <= now && now <= event.end) {
        if (event.summary) {
            drawOccupied(ctx, event.summary, event.organizer, getTimeStringFromDate(event.start) + " - " + getTimeStringFromDate(event.end))
        } else {
            drawOccupiedUnknown(ctx, getTimeStringFromDate(event.end))
        }
    } else if (now < event.start && (event.start.valueOf() - now.valueOf()) < 15 * 60 * 1000) {
        drawOpccupiedSoon(ctx, getTimeStringFromDate(event.start))
    } else if (now < event.start) {
        drawFreeUntil(ctx, getTimeStringFromDate(event.start))
    } else {
        console.log("No current event to draw?")
    }

}

async function doImageThings() {
    const canvas = setupCanvas()
    const ctx:CanvasRenderingContext2D = canvas.getContext('2d')
    const img: Image = await loadImage('image_processing/template.png')
    await drawHeader(ctx, img, 'Meeting Room', '1000.0')

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