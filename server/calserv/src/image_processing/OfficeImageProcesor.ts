import {ImageProcessor} from "./ImageProcessor";
import {Room} from "../datamodels/Room";
import {Person} from "../datamodels/Person";
import {PersonalInfo} from "../datamodels/PersonalInfo";
import * as config from "../../config/calendars.json";

export class OfficeImageProcesor extends ImageProcessor {
    init_y = 279
    single_offset = 307
    constructor() {
        super()
    }

    drawDivider() {
        this.ctx.fillStyle = "black";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(20, this.screenHeight / 2);
        this.ctx.lineTo(this.screenWidth - 20, this.screenHeight / 2);
        this.ctx.stroke();
    }

    drawPersonInformation(person: Person, yoffset_factor: number) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.font = '20pt "HNB"'
        const line_spacing = 29
        let name = person.name
        const init_x = 46
        const init_y = 141
        const yoffset_single = 307

        this.ctx.textAlign = "left"
        this.ctx.fillText(name, init_x, init_y + yoffset_factor*yoffset_single)
        this.ctx.font = '20pt "HNL"'
        this.ctx.fillText(person.job, init_x, init_y + 1 * line_spacing + yoffset_factor*yoffset_single)
        this.ctx.fillText(person.group, init_x, init_y + 2 * line_spacing + yoffset_factor*yoffset_single)

        // this.ctx.font = '16pt "HNL"'
        // if (person.phone) {
        //     this.ctx.fillText(person.phone, init_x, init_y + 240 + yoffset_factor*yoffset_single)
        // }
        //
        // if (person.email) {
        //     this.ctx.fillText(person.email, init_x, init_y + 220  + yoffset_factor*yoffset_single)
        // }

    }

    drawBusyMessage(personalInfo: PersonalInfo, yoffset_factor: number) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";

        const init_x = 122
        const line_spacing = 45

        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText(personalInfo.summary, this.screenWidth/2, this.init_y + yoffset_factor*this.single_offset)
        this.ctx.font = '22pt "HNB"'
        this.ctx.fillText(personalInfo.byline, this.screenWidth/2, this.init_y + yoffset_factor*this.single_offset + line_spacing)
    }


    async buildImage(room: Room, personalInfos: PersonalInfo[], voltage: number) {
        await this.drawHeader(room.name, room.id_string, room.logo)

        for (const [index, person] of room.persons.entries()) {
            this.drawPersonInformation(person, index)
            if (voltage && voltage < config.global_config.low_battery_voltage_cutoff_in_mv) {
                await this.drawLowBattery(this.init_y + index * this.single_offset)
            } else if (personalInfos[index]) {
                this.drawBusyMessage(personalInfos[index], index)
            }
            // this.drawOutOfOfficeNotice("30.10.2024", index)
        }
        if (room.persons.length > 1) {
            this.drawDivider()

        }


    }

}
