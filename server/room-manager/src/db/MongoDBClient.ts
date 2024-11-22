import mongoose, {Schema, Model, Document, Mongoose, ObjectId} from "mongoose"
import {IDevice} from "../../../datamodels/IDevice";
import {IRoom} from "../../../datamodels/IRoom";
import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {AppError} from "../datamodels/AppError";

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



export class MongoDBClient {
    db_endpoint = 'mongodb://localhost:27017/roommate'
    private db: Promise<mongoose.Mongoose>;

    static #instance: MongoDBClient;
    roomModel: Model<IRoomDocument>
    deviceModel: Model<IDeviceDocument>
    ewsUserModel: Model<IEWSTenantDocument>

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

}