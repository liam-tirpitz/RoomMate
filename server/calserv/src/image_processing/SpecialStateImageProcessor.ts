import {ImageProcessor} from "./ImageProcessor";
import {Room} from "../datamodels/Room";
import * as config from "../../config/calendars.json"

export class SpecialStateImageProcessor extends ImageProcessor {

    constructor() {
        super()
    }

    async drawUnprovisionedDevice() {
        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText("Hey, I am new here!", this.screenWidth/2, this.screenHeight/2)
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillText("Can you show me around?", this.screenWidth/2, this.screenHeight/2 + 30)
        this.ctx.fillText("Please configure WiFi Credentials.", this.screenWidth/2, this.screenHeight/2 + 80)

        this.ctx.fillText("Developed by DSMA@RWTH", this.screenWidth/2, this.screenHeight/2 + 300)

    }

    async drawNewDevice() {
        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText("Hello World!", this.screenWidth/2, this.screenHeight/2)
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillText("This device talks to a server.", this.screenWidth/2, this.screenHeight/2 + 50)
        this.ctx.fillText("Please configure its purpose.", this.screenWidth/2, this.screenHeight/2 + 80)

        this.ctx.fillText("Developed by DSMA@RWTH", this.screenWidth/2, this.screenHeight/2 + 300)
    }

    async buildLowBatImage(room: Room, voltage: number) {
        const header = await this.drawHeader(room.name, room.id_string, room.logo)
        await this.drawLowBattery(this.screenHeight/2)
    }

    async buildNewDeviceImage(device_id: string) {
        const header = await this.drawHeader("New Device", device_id.replace(new RegExp(`.{${2}}`, 'g'), '$&' + ":"), config.global_config.default_logo)
        await this.drawNewDevice()

    }







}