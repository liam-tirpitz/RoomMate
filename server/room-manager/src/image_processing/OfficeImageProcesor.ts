import {ImageProcessor} from "./ImageProcessor";
import {IRoom} from "../../../datamodels/IRoom";
import {IPerson} from "../../../datamodels/IPerson";
import {PersonalInfo} from "../datamodels/events/PersonalInfo";
import {CustomEvent} from "../datamodels/events/CustomEvent";

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

    drawPersonInformation(person: IPerson, yoffset_factor: number) {
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
        this.ctx.fillText(person.job, init_x, init_y + line_spacing + yoffset_factor*yoffset_single)
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

        const line_spacing = 45

        this.ctx.textAlign = "center"
        this.ctx.font = '26pt "HNB"'
        this.ctx.fillText(personalInfo.summary, this.screenWidth/2, this.init_y + yoffset_factor*this.single_offset)
        this.ctx.font = '22pt "HNB"'
        this.ctx.fillText(personalInfo.byline, this.screenWidth/2, this.init_y + yoffset_factor*this.single_offset + line_spacing)
    }

    drawCustomMssage(customEvent: CustomEvent, yoffset_factor: number) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";

        const init_x = 46
        const line_spacing = 24
        const local_y_difference = -30

        this.ctx.textAlign = "left"
        this.ctx.font = '22pt "HNB"'
        this.ctx.fillText(customEvent.summary, init_x, this.init_y + local_y_difference + yoffset_factor*this.single_offset)
        this.ctx.font = '16pt "HNL"'
        console.log(customEvent.lines)
        for (const [index, line] of customEvent.lines.entries()) {
            if (index >= 5) break
            console.log(line)
            this.ctx.fillText(line, init_x, this.init_y + local_y_difference + yoffset_factor*this.single_offset + (index+1) * line_spacing)
        }
    }

    async buildImage(room: IRoom, personalInfos: (CustomEvent | PersonalInfo)[], voltage: number) {
        await this.drawHeader(room.name, room.id_string, room.logo)

        for (const [index, person] of room.persons.entries()) {
            this.drawPersonInformation(person, index)
            if (voltage && voltage < (await this.dataRetrieval.getOrganizationById("")).low_battery_voltage_cutoff_in_mv) {
                await this.drawLowBattery(this.init_y + index * this.single_offset)
            } else if (personalInfos[index]) {
                const personalInfo = personalInfos[index]
                if (personalInfo instanceof PersonalInfo) {
                    this.drawBusyMessage(personalInfo, index)
                } else if (personalInfo instanceof CustomEvent) {
                    this.drawCustomMssage(personalInfo, index)
                }
            }
        }
        if (room.persons.length > 1) {
            this.drawDivider()

        }

        await this.drawFooter(voltage);
    }

}
