import {ImageProcessor} from "./ImageProcessor";
import {Room} from "../datamodels/Room";
import * as config from "../../config/calendars.json"

export class SpecialStateImageProcessor extends ImageProcessor {

    constructor() {
        super()
    }

    async drawUnprovisionedDevice() {
        const y_off = 100;
        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText("Hey, I am new here!", this.screenWidth/2, this.screenHeight/2 - y_off)
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillText("Can you show me around?", this.screenWidth/2, this.screenHeight/2 - y_off + 30)
        this.ctx.fillText("Please complete initial configuration.", this.screenWidth/2, this.screenHeight/2 - y_off + 80)
        this.ctx.font = '20pt "HNB"'
        this.ctx.fillText("RoomMate", this.screenWidth/2, this.screenHeight/2 + 278)
        this.ctx.font = '18pt "HNB"'

        this.ctx.fillText("Developed by DSMA@RWTH", this.screenWidth/2, this.screenHeight/2 + 300)

    }

    async drawNewDevice() {
        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText("Hello World!", this.screenWidth/2, this.screenHeight/2)
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillText("This RoomMate is connected.", this.screenWidth/2, this.screenHeight/2 + 50)
        this.ctx.fillText("Please associate it with a room.", this.screenWidth/2, this.screenHeight/2 + 75)

        this.ctx.font = '20pt "HNB"'
        this.ctx.fillText("RoomMate", this.screenWidth/2, this.screenHeight/2 + 278)
        this.ctx.font = '18pt "HNB"'
        this.ctx.fillText("Developed by DSMA@RWTH", this.screenWidth/2, this.screenHeight/2 + 300)
    }

    async buildLowBatImage(room: Room, voltage: number) {
        const header = await this.drawHeader(room.name, room.id_string, room.logo)
        await this.drawLowBattery(this.screenHeight/2)
        await this.drawFooter(voltage);
    }

    async buildNewDeviceImage(device_id: string, voltage) {
        const header = await this.drawHeader("New RoomMate", device_id.replace(new RegExp(`.{${2}}`, 'g'), '$&' + ":"), config.global_config.default_logo)
        // const header = await this.drawHeader("New RoomMate", "", config.global_config.default_logo)

        await this.drawNewDevice()
        await this.drawFooter(voltage);
        // await this.drawUnprovisionedDevice()
    }







}