import {SimpleEvent} from "./SimpleEvent";

export interface IInfoPacket {
    current_time_string: string;
    current_time_unix: number;
    next_update_unix: number;
    room_name: string;
    room_number: string;
    hash: string;
    next_appointments: SimpleEvent[];
    is_night: boolean;
    is_weekend: boolean;
}