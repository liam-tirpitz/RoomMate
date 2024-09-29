import {SimpleEvent} from "../datamodels/SimpleEvent"

import {registerFont, createCanvas, loadImage, CanvasRenderingContext2D, Canvas, Image} from 'canvas'
import * as fs from 'fs';

class ImageProcessor {
    ctx: CanvasRenderingContext2D;
    canvas: Canvas;
    img: Promise<Image> = loadImage('image_processing/template.png')

    constructor() {
        this.canvas = this.setupCanvas();
        this.ctx = this.canvas.getContext('2d')
    }

    setupCanvas(): Canvas {
        registerFont('image_processing/fonts/HelveticaNeueLTCom-Bd.ttf', { family: 'HNB' })
        registerFont('image_processing/fonts/HelveticaNeueLTCom-Lt.ttf', { family: 'HNL' })
        return createCanvas(480, 800)
    }

    drawCurrentEventTime(timestring: string, black_font: boolean = false) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        if (black_font) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        }
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillText(timestring, 32, 242)
    }

    drawCurrentEventBlackBox() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 106, 480, 169);
    }

    drawCurrentEventWhiteBox() {
        this.ctx.lineWidth = 2;
        this.ctx.beginPath()
        this.ctx.strokeStyle = 'black';
        this.ctx.strokeRect(-2, 106, 482, 169);
        this.ctx.closePath()
    }

    drawCurrentEventInfo(info: string, black_font: boolean = false) {
        this.ctx.font = '42pt "HNB"'
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        if (black_font) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        }
        this.ctx.fillText(info, 32, 202)
    }

    drawOccupied(summary: string, organizer: string, timestring: string) {
        this.drawCurrentEventBlackBox()
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillStyle = "rgba(255, 255, 255, 1";
        this.ctx.fillText(summary, 32, 160)
        this.ctx.font = '18pt "HNL"'
        this.ctx.fillText(organizer, 32, 186)
        this.drawCurrentEventTime(timestring, false)
    }

    drawOccupiedUnknown(end: string) {
        this.drawCurrentEventBlackBox()
        this.drawCurrentEventInfo("Booked", false)
        this.drawCurrentEventTime("Until " + end, false)
    }

    drawFreeUntil(end: string) {
        this.drawCurrentEventWhiteBox()
        this.drawCurrentEventInfo("Available", true)
        this.drawCurrentEventTime("Until " + end, true)
    }

    drawOpccupiedSoon(start: string) {
        this.drawCurrentEventWhiteBox()
        this.drawCurrentEventInfo("Next Meeting", true)
        this.drawCurrentEventTime("Starts soon - " + start, true)
    }

    async drawHeader(room_name: string, room_number: string) {
        this.ctx.drawImage(await this.img, 0, 0)

        this.ctx.font = '21pt "HNB"'
        this.ctx.fillText(room_name, 248, 62)

        this.ctx.font = '15pt "HNB"'
        this.ctx.fillText(room_number, 248, 83)
    }

    getTimeStringFromDate(date: Date) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }

    drawCurrentEvent(event: SimpleEvent) {
        const now: Date = new Date();
        console.log(now, event.start)
        if (event.start <= now && now <= event.end) {
            if (event.summary) {
                this.drawOccupied(event.summary, event.organizer, this.getTimeStringFromDate(event.start) + " - " + this.getTimeStringFromDate(event.end))
            } else {
                this.drawOccupiedUnknown(this.getTimeStringFromDate(event.end))
            }
        } else if (now < event.start && (event.start.valueOf() - now.valueOf()) < 15 * 60 * 1000) {
            this.drawOpccupiedSoon(this.getTimeStringFromDate(event.start))
        } else if (now < event.start) {
            this.drawFreeUntil(this.getTimeStringFromDate(event.start))
        } else {
            console.log("No current event to draw?")
        }
    }
}


async function doImageThings() {
    const imgProc = new ImageProcessor();
    const header = imgProc.drawHeader('Meeting Room', '1000.0')

    const start = new Date(Date.parse("2024-09-29T13:12:00"));
    const end = new Date(Date.parse('2024-09-29T15:00:00'));

    const event = new SimpleEvent(start, end, "[IDB] Status Meeting with HiWis", "Liam Tirpitz")
    imgProc.drawCurrentEvent(event)
    await header
    const out = fs.createWriteStream( 'out.png')
    const stream = imgProc.canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () =>  console.log('The PNG file was created.'))
}

doImageThings().then()