import * as utils from '../utils'
import path from "node:path";

import {
    registerFont,
    createCanvas,
    loadImage,
    CanvasRenderingContext2D,
    Canvas,
    Image,
    NodeCanvasRenderingContext2DSettings, createImageData
} from 'canvas'
import {dithering} from "./image2cpp/dithering";
import {IDBClient} from "../db/IDBClient";
import {ConfigManager} from "../ConfigManager";


export interface IRenderedScreen {
    // base64 of the rotated 1-bit image the device draws
    packed: string
    png: Buffer
}

export class ImageProcessor {
    ctx: CanvasRenderingContext2D;
    canvas: Canvas;
    dithering_threshold: number = 128
    remove_zero_commas: boolean = false
    _bitswap: boolean = false
    screenWidth = 480
    screenHeight = 800
    dataRetrieval: IDBClient

    constructor() {
        this.canvas = this.setupCanvas();
        const settings: NodeCanvasRenderingContext2DSettings = {}
        this.ctx = this.canvas.getContext( '2d',  settings)
        this.dataRetrieval = ConfigManager.instance.getDBClient()

    }

    setupCanvas(): Canvas {
        registerFont('./src/image_processing/fonts/HelveticaNeueLTCom-Bd.ttf', { family: 'HNB' })
        registerFont('./src/image_processing/fonts/HelveticaNeueLTCom-Lt.ttf', { family: 'HNL' })
        return createCanvas(this.screenWidth, this.screenHeight)
    }


    async drawHeader(room_name: string, room_number: string, logo: string) {
        const logo_img = loadImage('./config/' + logo)
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
        this.ctx.fillStyle = "black";
        this.ctx.drawImage(await logo_img, 0, 0)
        this.ctx.font = '36pt "HNB"'
        this.ctx.fillText(room_number, 248, 62)

        this.ctx.font = '15pt "HNB"'
        this.ctx.fillText(room_name, 248, 83)
    }


    // Dithers the screen and returns it twice: as a PNG the way it looks on the sign (for the web UI and
    // /image?png=true) and rotated by 90° and packed to 1 bit per pixel for the display (base64).
    // The dithering is a plain threshold, so taking the PNG before the rotation shows exactly the same pixels.
    async finalizeImage(): Promise<IRenderedScreen> {
        dithering(this.ctx, this.screenWidth, this.screenHeight, this.dithering_threshold, 0);
        const png = this.canvas.toBuffer('image/png')

        this.rotate(90)
        let myImageData = this.ctx.getImageData(0, 0, this.screenHeight, this.screenWidth);
        const data_arr = this.horizontal1bit(Array.from(myImageData.data), this.screenHeight)
        const packed = btoa(String.fromCharCode.apply(null, data_arr));
        return {packed, png}
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

    async drawLowBattery(y_offset: number){
        const low_bat = await loadImage('./src/image_processing/assets/lowbat.png')
        const img_width = 100
        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText("Low Battery", this.screenWidth/2, y_offset)
        this.ctx.drawImage(low_bat, this.screenWidth/2 - img_width/2, y_offset, img_width, img_width * low_bat.height / low_bat.width)
    }

    getIconFromVoltage(v: number) {
        let bat_img;
        const paths = path.join(__dirname,'assets')
        if (v > 4150) {
            bat_img = loadImage(path.join(paths, "battery_5.png"))
        } else if (v > 4050) {
            bat_img = loadImage(path.join(paths, "battery_4.png"))
        } else if (v > 3950) {
            bat_img = loadImage(path.join(paths, "battery_3.png"))
        } else if (v > 3850) {
            bat_img = loadImage(path.join(paths, "battery_2.png"))
        } else if (v > 3800) {
            bat_img = loadImage(path.join(paths, "battery_1.png"))
        } else  {
            bat_img = loadImage(path.join(paths, "battery_0.png"))
        }
        return bat_img
    }

    async drawFooter(voltage: number) {
        this.ctx.textAlign = "right"
        this.ctx.font = '16pt "HNB"'
        const now = new Date
        const date_str = utils.getDateStringFromDate(now)
        const time_str = utils.getTimeStringFromDate(now)
        this.ctx.fillText(date_str, this.screenWidth-20, this.screenHeight - 20)
        // this.ctx.fillText(time_str, this.screenWidth-20, this.screenHeight - 20)
        this.ctx.textAlign = "left"
        if(voltage) {
            // this.ctx.fillText(String(getPercentageFromVoltage(voltage) + "%"), 20, this.screenHeight - 20)
            const bat_img = await this.getIconFromVoltage(voltage)
            const img_width = 50
            const img_height =  img_width * bat_img.height / bat_img.width
            this.ctx.drawImage(bat_img, 20, this.screenHeight - img_height, img_width, img_height)
        }


    }



}