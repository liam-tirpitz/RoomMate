import {IRoom} from "./datamodels/IRoom";
import {IDevice} from "./datamodels/IDevice";
import {IEWSTenant} from "./datamodels/IEWSTenant";

export class ConfigRetrieval {
    calendars: any


    constructor() {
        this.calendars = require('../config/calendars.json');
    }

    getRoomFromDeviceID(devid: string): IRoom {
        for (const room of this.calendars.calendars as IRoom[]) {
            for (const device of room.devices as IDevice[]) {
                if (device.device_id == devid) {
                    return room
                }
            }
        }
        return undefined
    }

    getExchangeTenantByID(tenant_id: number): IEWSTenant {
        for (const tenant of this.calendars.exchange.tenants as IEWSTenant[]) {
                if (tenant.id == tenant_id) {
                    return tenant
                }
        }
        return undefined
    }
}
