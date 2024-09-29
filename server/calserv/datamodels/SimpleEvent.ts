export class SimpleEvent {
    start: Date;
    end: Date;
    summary: string;
    organizer: string;

    constructor(start: Date, end: Date, summary: string, organizer: string) {
        this.start = start;
        this.end = end;
        this.summary = summary;
        this.organizer = organizer;
    }
}