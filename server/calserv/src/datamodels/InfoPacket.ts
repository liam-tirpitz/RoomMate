import {SimpleEvent} from "./SimpleEvent";

export class InfoPacket {
    current_time_string: string;
    current_time_unix: number;
    next_update_unix: number;
    room_name: string;
    room_number: string;
    hash: string;
    next_appointments: SimpleEvent[];
    is_night: boolean = false;
    is_weekend: boolean = false;
}