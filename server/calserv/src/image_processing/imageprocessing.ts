import {SimpleEvent} from "../datamodels/SimpleEvent"
import * as moment from "moment-timezone";

import {
    registerFont,
    createCanvas,
    loadImage,
    CanvasRenderingContext2D,
    Canvas,
    Image,
    NodeCanvasRenderingContext2DSettings, createImageData
} from 'canvas'
import * as fs from 'fs';
import {DateTime} from "ews-javascript-api";
import {dithering} from "./image2cpp/dithering";


export class ImageProcessor {
    ctx: CanvasRenderingContext2D;
    canvas: Canvas;
    img: Promise<Image> = loadImage('image_processing/template.png')
    dithering_threshold: number = 128
    remove_zero_commas: boolean = false
    _bitswap: boolean = false
    screenWidth = 480
    screenHeight = 800

    constructor() {
        this.canvas = this.setupCanvas();
        const settings: NodeCanvasRenderingContext2DSettings = {}
        this.ctx = this.canvas.getContext( '2d',  settings)
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
        this.ctx.fillText(event.organizer, 46, 375 + 1 * line_spacing + yoffset*105)
        this.ctx.fillText(this.getTimeStringFromDate(event.start) + " - " + this.getTimeStringFromDate(event.end), 46, 375 + 2 * line_spacing + yoffset*105)
    }


    async drawHeader(room_name: string, room_number: string) {
        this.ctx.drawImage(await this.img, 0, 0)

        this.ctx.font = '21pt "HNB"'
        this.ctx.fillText(room_name, 248, 62)

        this.ctx.font = '15pt "HNB"'
        this.ctx.fillText(room_number, 248, 83)
    }

    getTimeStringFromDate(date: moment.Moment) {
        return date.toDate().toLocaleTimeString(['de'], {hour: '2-digit', minute:'2-digit'})
    }

    drawCurrentEvent(event: SimpleEvent) {
        const now: DateTime = DateTime.Now;
        if (event.happeningNow(now)) {
            if (event.summary) {
                let trunc_summary = event.summary
                if (trunc_summary.length > 33) {
                    trunc_summary = trunc_summary.substring(0,30)  + "...";
                }
                this.drawOccupied(trunc_summary, event.organizer, this.getTimeStringFromDate(event.start) + " - " + this.getTimeStringFromDate(event.end))
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

    bitswap(b) {
        if (this._bitswap) {
            // eslint-disable-next-line no-bitwise, no-mixed-operators, no-param-reassign
            b = (b & 0xF0) >> 4 | (b & 0x0F) << 4;
            // eslint-disable-next-line no-bitwise, no-mixed-operators, no-param-reassign
            b = (b & 0xCC) >> 2 | (b & 0x33) << 2;
            // eslint-disable-next-line no-bitwise, no-mixed-operators, no-param-reassign
            b = (b & 0xAA) >> 1 | (b & 0x55) << 1;
        }
        return b;
    }
    vertical1bit(data, canvasWidth) {
        let stringFromBytes = '';
        let outputIndex = 0;
        for (let p = 0; p < Math.ceil(this.screenHeight / 8); p++) {
            for (let x = 0; x < this.screenWidth; x++) {
                let byteIndex = 7;
                let number = 0;

                for (let y = 7; y >= 0; y--) {
                    const index = ((p * 8) + y) * (this.screenWidth * 4) + x * 4;
                    const avg = (data[index] + data[index + 1] + data[index + 2]) / 3;
                    if (avg > this.dithering_threshold) {
                        number += 2 ** byteIndex;
                    }
                    byteIndex--;
                }
                let byteSet = this.bitswap(number).toString(16);
                if (byteSet.length === 1) { byteSet = `0${byteSet}`; }
                if (!this.remove_zero_commas) {
                    stringFromBytes += `0x${byteSet.toString(16)}, `;
                } else {
                    stringFromBytes += byteSet.toString(16);
                }
                outputIndex++;
                if (outputIndex >= 16) {
                    stringFromBytes += '\n';
                    outputIndex = 0;
                }
            }
        }
        return stringFromBytes;
    }

    rotate(rotation: number) {
        if (rotation !== 0) {
            const clone = this.setupCanvas();
            clone.getContext('2d').drawImage(this.canvas, 0, 0);
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            if (rotation === 90) {
                this.canvas.width = this.screenHeight;
                this.canvas.height = this.screenWidth;
                this.ctx.setTransform(1, 0, 0, 1, this.canvas.width, 0);
                this.ctx.rotate(Math.PI / 2);
                this.ctx.drawImage(clone, 0, 0);
            } else if (rotation === 180) {
                this.ctx.setTransform(1, 0, 0, 1, this.canvas.width, this.canvas.height);
                this.ctx.rotate(Math.PI);
                this.ctx.drawImage(clone, 0, 0);
            } else if (rotation === 270) {
                this.canvas.width = this.screenHeight;
                this.canvas.height = this.screenWidth;
                this.ctx.setTransform(1, 0, 0, 1, 0, this.canvas.height);
                this.ctx.rotate(Math.PI * 1.5);
                this.ctx.drawImage(clone, 0, 0);
            }
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }



horizontal1bit(data, canvasWidth) {
        let stringFromBytes = '';
        let outputIndex = 0;
        let byteIndex = 7;
        let number = 0;
        let outputBytes = []

        // format is RGBA, so move 4 steps per pixel
        for (let index = 0; index < data.length; index += 4) {
            // Get the average of the RGB (we ignore A)
            const avg = (data[index] + data[index + 1] + data[index + 2]) / 3;
            if (avg > this.dithering_threshold) {
                number += 2 ** byteIndex;
            }
            byteIndex--;

            // if this was the last pixel of a row or the last pixel of the
            // image, fill up the rest of our byte with zeros so it always contains 8 bits
            if ((index !== 0 && (((index / 4) + 1) % (canvasWidth)) === 0) || (index === data.length - 4)) {
                // for(var i=byteIndex;i>-1;i--){
                // number += Math.pow(2, i);
                // }
                byteIndex = -1;
            }

            // When we have the complete 8 bits, combine them into a hex value
            if (byteIndex < 0) {
                let byteSet = this.bitswap(number);
                if (byteSet.length === 1) { byteSet = `0${byteSet}`; }
                if (!this.remove_zero_commas) {
                    outputBytes.push(byteSet)
                    //stringFromBytes += `0x${byteSet}, `;
                } else {
                    outputBytes.push(byteSet)
                    //stringFromBytes += byteSet;
                }
                outputIndex++;
                if (outputIndex >= 16) {
                    if (!this.remove_zero_commas) {
                        stringFromBytes += '\n';
                    }
                    outputIndex = 0;
                }
                number = 0;
                byteIndex = 7;
            }
        }
        return outputBytes;
    }


    async buildImage(room_name: string, room_number: string, room_id: string, data: SimpleEvent[]) {
        const header = await this.drawHeader(room_name, room_number)
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

        this.rotate(90)
        dithering(this.ctx, 480, 800, this.dithering_threshold, 0);
        let myImageData = this.ctx.getImageData(0, 0, 800, 480);
        const data_arr = this.horizontal1bit(Array.from(myImageData.data), 800)
        const base64String = btoa(String.fromCharCode.apply(null, data_arr));
        // console.log(JSON.stringify(base64String))
        const out = fs.createWriteStream( room_id + '.png')
        const stream = this.canvas.createPNGStream()
        stream.pipe(out)
        out.on('finish', () =>  console.log('The PNG file was created.', (new Date()).toISOString()))
        return base64String
    }
}