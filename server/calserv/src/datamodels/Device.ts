export class Device {
    id: number
    device_id: string
    location: string
    calendar_id: number


    constructor(id: number, device_id: string, location: string, calendar_id: number) {
        this.id = id;
        this.device_id = device_id;
        this.location = location;
        this.calendar_id = calendar_id;
    }
}