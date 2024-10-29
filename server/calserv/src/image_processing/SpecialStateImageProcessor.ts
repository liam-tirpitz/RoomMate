import {ImageProcessor} from "./ImageProcessor";
import {loadImage, NodeCanvasRenderingContext2DSettings} from "canvas";
import {SimpleEvent} from "../datamodels/SimpleEvent";
import {DateTime} from "ews-javascript-api";
import {Room} from "../datamodels/Room";

export class SpecialStateImageProcessor extends ImageProcessor {

    constructor() {
        super()
    }




    async buildLowBatImage(room: Room, voltage: number) {
        const header = await this.drawHeader(room.name, room.id_string, room.logo)
        await this.drawLowBattery(this.screenHeight/2)

    }






}