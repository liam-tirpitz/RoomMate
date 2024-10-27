// import * as calendars from "../config/calendars.json";
// import * as devices from '../config/devices.json';

import {CalendarInfo} from "./datamodels/CalendarInfo";
import {Device} from "./datamodels/Device";

export class DataRetrieval {
    devices: any
    calendars: any


    constructor() {
        this.devices = require('../config/devices.json');
        this.calendars = require('../config/calendars.json');
    }

    getCalendarIDFromDeviceID(devid: string) {
        for (const device of this.devices.devices as Device[]) {
            if (device.device_id == devid) {
                return device.calendar_id
            }
        }
        return undefined
    }

    getCalendarFromCalendarID(calendarID: number): CalendarInfo {
        for (const calendar of this.calendars.calendars as CalendarInfo[]) {
            if (calendar.id == calendarID) {
                return calendar
            }
        }
        return undefined
    }
}
