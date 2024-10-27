export class Device {
    device_id: string
    location: string

    constructor(device_id: string, location: string,) {
        this.device_id = device_id;
        this.location = location;
    }
}