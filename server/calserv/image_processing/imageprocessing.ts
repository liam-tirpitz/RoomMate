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
import BitSet from "bitset";


export class ImageProcessor {
    ctx: CanvasRenderingContext2D;
    canvas: Canvas;
    img: Promise<Image> = loadImage('image_processing/template.png')

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

    getTimeStringFromDate(date: moment) {
        return date.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }

    drawCurrentEvent(event: SimpleEvent) {
        const now: DateTime = DateTime.Now;
        console.log(now, event.start)
        if (event.start <= now && now <= event.end) {
            if (event.summary) {
                let trunc_summary = event.summary
                if (trunc_summary.length > 30) {
                    trunc_summary = trunc_summary.substring(0,30)  + "...";
                }
                this.drawOccupied(trunc_summary, event.organizer, this.getTimeStringFromDate(event.start) + " - " + this.getTimeStringFromDate(event.end))
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

    prepImage(data: Uint8ClampedArray) {
        var bs = new BitSet;
        data.map((x, i) => {
            if ((i+1)%4 == 0) return 255
            if (x <128) return 0
            else return 255
        })
        data.forEach((x,i )=> {
            if (i%4 == 0) {
                bs.set(Math.floor(i/4), x === 255 ? 1 : 0); // Set bit at position 128
            }
            // console.log(i/4)
        })
        return bs
    }

    hexToBytes(hex) {
        let bytes = [];
        for (let c = 0; c < hex.length; c += 2)
            bytes.push(parseInt(hex.substr(c, 2), 16));
        return bytes;
    }

    bytesToHex(bytes) {
        let hex = [];
        for (let i = 0; i < bytes.length; i++) {
            let current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
            hex.push((current >>> 4).toString(16));
            hex.push((current & 0xF).toString(16));
        }
        return hex;
    }

    // bitsetToByteArray(data: BitSet) {
    //     let bytes = []
    //     for (let i = 0; i < Math.floor(data.cardinality()/8); i++) {
    //         const byte_str = "0x" + data.slice(i*8,i*8+7).toString(16)
    //     }
    //
    // }

    async buildImage(room_name: string, room_number: string, room_id: string, data: SimpleEvent[]) {
        const header = await this.drawHeader(room_name, room_number)
        if (data.length) {
            this.drawCurrentEvent(data[0])
        } else {
            this.drawFreeUntil("End of Day")
        }

        let myImageData = this.ctx.getImageData(0, 0, 480, 800);
        const array: BitSet  = this.prepImage(myImageData.data)
        console.log(array.cardinality())
        // let modimageData = createImageData(array,480)
        // this.ctx.putImageData(modimageData, 0, 0)
        const bytearray = this.hexToBytes(array.toString(16))
        console.log(bytearray.toString())
        const out = fs.createWriteStream( room_id + '.png')
        const stream = this.canvas.createPNGStream()
        stream.pipe(out)
        out.on('finish', () =>  console.log('The PNG file was created.'))
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


//doImageThings().then()