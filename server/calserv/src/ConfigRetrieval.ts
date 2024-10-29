import {Room} from "./datamodels/Room";
import {Device} from "./datamodels/Device";
import {EWSTenant} from "./datamodels/EWSTenant";

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

    getExchangeTenantByID(tenant_id: number): EWSTenant {
        for (const tenant of this.calendars.exchange.tenants as EWSTenant[]) {
                if (tenant.id == tenant_id) {
                    return tenant
                }
        }
        return undefined
    }
}
