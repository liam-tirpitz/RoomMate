export class EWSTenant {
    id: number
    endpoint: string
    user: string
    secret: string


    constructor(id: number, endpoint: string, user: string, secret: string) {
        this.id = id;
        this.endpoint = endpoint;
        this.user = user;
        this.secret = secret;
    }
}