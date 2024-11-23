import mongoose, {Schema, Model, Document, Mongoose, ObjectId, Promise} from "mongoose"
import {IDevice} from "../../../datamodels/IDevice";
import {IRoom} from "../../../datamodels/IRoom";
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {IDBClient} from "./IDBClient";
import {IOrganization} from "../../../datamodels/IOrganization";


interface IRoomDocument extends IRoom, Document {}
interface IRoomModel extends Model<IRoomDocument> {
    buildRoom(args:IRoom): IRoomDocument;
}

interface IDeviceDocument extends IDevice, Document {}
interface IDeviceModel extends Model<IDeviceDocument> {
    buildDevice(args:IDevice): IDeviceDocument;
}

interface IEWSTenantDocument extends IEWSTenant, Document {}
interface IEWSTenantModel extends Model<IEWSTenantDocument> {
    buildDevice(args:IEWSTenant): IEWSTenantDocument;
}

interface IOrganizationDocument extends IOrganization, Document {}
interface IorganizationModel extends Model<IOrganizationDocument> {
    buildDevice(args:IOrganization): IOrganizationDocument;
}



export class MongoDBClient implements IDBClient {
    db_endpoint = process.env.MONGO_CONNECTION
    private db: Promise<mongoose.Mongoose>;

    static #instance: MongoDBClient;
    roomModel: Model<IRoomDocument>
    deviceModel: Model<IDeviceDocument>
    ewsUserModel: Model<IEWSTenantDocument>
    orgModel: Model<IOrganizationDocument>


    roomSchema: Schema = new Schema<IRoom>({
        room_number: { type: Number, required: true },
        id_string: { type: String, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: false },
        ews_info: {
            email: {type: String},
            tenant_id: {type: 'ObjectId', ref: 'EWSUser', required: false, autopopulate: true }
        },
    });

    deviceSchema: Schema = new Schema<IDevice>({
        device_id: { type: String, required: true },
        location: { type: String, required: false },
        last_contact: { type: String, required: false },
        battery: { type: String, required: false },
        room_id: {type: 'ObjectId', ref: 'Room', required: false, autopopulate: true }
    });


    ewsUserSchema: Schema = new Schema<IEWSTenant>({
        endpoint: { type: String, required: true },
        user: { type: String, required: true },
        secret: { type: String, required: true },
    });

    orgSchema: Schema = new Schema<IOrganization>({
        name: { type: String, required: true },
        external_identifier: { type: String, required: true },
        soon_threshold_in_min: { type: Number, required: true },
        night_start_hour: { type: Number, required: true },
        night_end_hour: { type: Number, required: true },
        timezone: { type: String, required: true },
        low_battery_voltage_cutoff_in_mv: { type: Number, required: true },
        default_logo: { type: String, required: true },
    });


    constructor() {
        this.initDB().then(client => {
            this.roomSchema.plugin(require('mongoose-autopopulate'));
            this.deviceSchema.plugin(require('mongoose-autopopulate'));
            this.roomModel = mongoose.model<IRoomDocument>('Room', this.roomSchema);
            this.deviceModel = mongoose.model<IDeviceDocument>('Device', this.deviceSchema);
            this.ewsUserModel = mongoose.model<IEWSTenantDocument>('EWSUser', this.ewsUserSchema);
        })
    }

    public static get instance(): MongoDBClient {
        if (!MongoDBClient.#instance) {
            MongoDBClient.#instance = new MongoDBClient();
        }

        return MongoDBClient.#instance;
    }

    private async initDB(): Promise<Mongoose> {
        const client = mongoose.connect(this.db_endpoint, {
            authSource: "admin",
            user: "root",
            pass: "example",
        })
        this.db = client
        return client
    }


    private async getDb(): Promise<Mongoose> {
        return this.db
    }

      async updateRoom(id: string, room: IRoom) {
        await this.getDb()
        return this.roomModel.findByIdAndUpdate(id, room).exec()
    }

    async addRoom(room: IRoom) {
        await this.getDb()
        return this.roomModel.create(room);
    }

    async deleteRoom(id: string) {
        await this.getDb()
        return this.roomModel.findByIdAndDelete(id).exec();
    }

    async getRooms(): Promise<Array<IRoom>> {
        await this.getDb()
        return this.roomModel.find({}).exec()

    }

    async getRoom(id: string): Promise<IRoom> {
        await this.getDb()
        return this.roomModel.findById(id).exec();
    }

    async getRoomForDevice(device_id: string): Promise<IRoom | null> {
        const device = await this.getDeviceFromHardwareID(device_id)
        console.log(device)
        return undefined
    }


    async updateDevice(id: string, device: IDevice) {
        await this.getDb()
        return this.deviceModel.findByIdAndUpdate(id, device).exec()
    }

    async addDevice(device: IDevice) {
        await this.getDb()
        return this.deviceModel.create(device);
    }

    async deleteDevice(id: string) {
        await this.getDb()
        return this.deviceModel.findByIdAndDelete(id).exec();
    }

    async getDevices(): Promise<Array<IDevice>> {
        await this.getDb()
        return this.deviceModel.find({}).exec()
    }

    async getDevice(id: string): Promise<IDevice> {
        await this.getDb()
        return this.deviceModel.findById(id).exec();
    }

    async getDeviceFromHardwareID(id: string): Promise<IDevice> {
        await this.getDb()
        return this.deviceModel.findOne({device_id: id}).exec();
    }


    async updateEwsUser(id: string, user: IEWSTenant) {
        await this.getDb()
        return this.ewsUserModel.findByIdAndUpdate(id, user).exec()
    }

    async addEwsUser(user: IEWSTenant) {
        await this.getDb()
        return this.ewsUserModel.create(user);
    }

    async deleteEwsUser(id: string) {
        await this.getDb()
        return this.ewsUserModel.findByIdAndDelete(id).exec();
    }

    async getEwsUsers(): Promise<Array<IEWSTenant>> {
        await this.getDb()
        return this.ewsUserModel.find({}).exec()
    }

    async getEwsUser(id: string): Promise<IEWSTenant> {
        await this.getDb()
        return this.ewsUserModel.findById(id).exec();
    }

    async getOrganization(): Promise<IOrganization> {
        await this.getDb()
        return undefined;
    }

    async setOrganization(org: IOrganization): Promise<IOrganization> {
        return undefined;
    }

}