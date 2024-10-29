import {ImageProcessor} from "./ImageProcessor";
import {NodeCanvasRenderingContext2DSettings} from "canvas";
import {SimpleEvent} from "../datamodels/SimpleEvent";
import {DateTime} from "ews-javascript-api";
import * as config from "../../config/calendars.json";

export class BookableResourceImageProcessor extends ImageProcessor {

    constructor() {
        super()
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
        this.ctx.fillRect(0, 106, this.screenWidth, 169);
    }

    drawCurrentEventWhiteBox() {
        this.ctx.lineWidth = 2;
        this.ctx.beginPath()
        this.ctx.strokeStyle = 'black';
        this.ctx.strokeRect(-2, 106, 484, 169);
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

    drawComingUp() {
        this.ctx.font = '24pt "HNB"'
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillText("Coming Up", 32, 322)
    }

    drawNothingComingUp() {
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillText("No further appointments today.", 32, 322)
    }


    drawBlock(yoffset: number, event: SimpleEvent) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.font = '20pt "HNB"'
        const line_spacing = 29
        let trunc_summary = event.summary
        if (trunc_summary.length > 30) {
            trunc_summary = trunc_summary.substring(0,27)  + "...";
        }

        this.ctx.fillText(trunc_summary, 46, 375 + yoffset*105)
        this.ctx.font = '20pt "HNL"'
        this.ctx.fillText(event.byline, 46, 375 + 1 * line_spacing + yoffset*105)
        this.ctx.fillText(this.getTimeStringFromDate(event.start) + " - " + this.getTimeStringFromDate(event.end), 46, 375 + 2 * line_spacing + yoffset*105)
    }

    drawCurrentEvent(event: SimpleEvent) {
        const now: DateTime = DateTime.Now;
        if (event.happeningNow(now)) {
            if (event.summary) {
                let trunc_summary = event.summary
                if (trunc_summary.length > 33) {
                    trunc_summary = trunc_summary.substring(0,30)  + "...";
                }
                this.drawOccupied(trunc_summary, event.byline, this.getTimeStringFromDate(event.start) + " - " + this.getTimeStringFromDate(event.end))
            } else {
                this.drawOccupiedUnknown(this.getTimeStringFromDate(event.end))
            }
        } else if (event.happeningSoon(now)) {
            this.drawOpccupiedSoon(this.getTimeStringFromDate(event.start))
        } else if (now.MomentDate < event.start) {
            this.drawFreeUntil(this.getTimeStringFromDate(event.start))
        } else {
            console.log("No current event to draw?")
        }
    }

    async buildImage(room_name: string, room_number: string, room_id: string, logo: string, data: SimpleEvent[]) {
        const header = await this.drawHeader(room_name, room_number, logo)
        if (data.length) {
            this.drawCurrentEvent(data[0])
            const now = DateTime.Now
            if (data[0].happeningNow(now)) {
                data.shift()
            }
            if (data.length) {
                this.drawComingUp()
                const upcoming_elements = data.slice(0, 4)
                for (const [i, element] of upcoming_elements.entries()) {
                    this.drawBlock(i, element)
                }
            } else {
                this.drawNothingComingUp()
            }
        } else {
            this.drawFreeUntil("End of Day")
        }
    }






}