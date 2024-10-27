import {ImageProcessor} from "./ImageProcessor";
import {Room} from "../datamodels/Room";
import {Person} from "../datamodels/Person";

export class OfficeImageProcesor extends ImageProcessor {

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

        this.ctx.fillText(name, init_x, init_y + yoffset_factor*yoffset_single)
        this.ctx.font = '20pt "HNL"'
        this.ctx.fillText(person.job, init_x, init_y + 1 * line_spacing + yoffset_factor*yoffset_single)
        this.ctx.fillText(person.group, init_x, init_y + 2 * line_spacing + yoffset_factor*yoffset_single)
    }

    drawOutOfOfficeNotice(until: string, yoffset_factor: number) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.font = '26pt "HNB"'

        const init_x = 122
        const init_y = 279
        const yoffset_single = 307
        const line_spacing = 45


        this.ctx.fillText("Out of Office", init_x, init_y + yoffset_factor*yoffset_single)
        this.ctx.fillText("Until " + until, 101, init_y + yoffset_factor*yoffset_single + line_spacing)

    }


        async buildImage(room: Room) {
        await this.drawHeader(room.name, room.id_string, room.logo)

        for (const [index, person] of room.persons.entries()) {
            this.drawPersonInformation(person, index)
            // this.drawOutOfOfficeNotice("30.10.2024", index)
        }
        if (room.persons.length > 1) {
            this.drawDivider()

        }


    }

}
