
export class EWSCalendarInfo {
    email: string
    tenant_id: number


    constructor(email: string, tenant_id: number) {
        this.email = email;
        this.tenant_id = tenant_id;
    }
}