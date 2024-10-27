import {Room} from "./datamodels/Room";
import {Device} from "./datamodels/Device";

export class ConfigRetrieval {
    calendars: any


    constructor() {
        this.calendars = require('../config/calendars.json');
    }

    getRoomFromDeviceID(devid: string): Room {
        for (const room of this.calendars.calendars as Room[]) {
            for (const device of room.devices as Device[]) {
                if (device.device_id == devid) {
                    return room
                }
            }
        }
        return undefined
    }

    getDeviceFromDeviceID(devid: string): Device {
        for (const room of this.calendars.calendars as Room[]) {
            for (const device of room.devices as Device[]) {
                if (device.device_id == devid) {
                    return device
                }
            }
        }
        return undefined
    }


    getRoomFromRoomID(roomID: number): Room {
        for (const room of this.calendars.calendars as Room[]) {
            if (room.id == roomID) {
                return room
            }
        }
        return undefined
    }
}
