import {IRoom} from "../../../datamodels/IRoom";
import mongoose, {Schema, Model, Document, Mongoose, Connection, createConnection, mongo} from "mongoose"

interface IRoomDocument extends IRoom, Document {}
interface IRoomModel extends Model<IRoomDocument> {
    buildRoom(args:IRoom): IRoomDocument;
}


export class MongoDBClient {
    db_endpoint = 'mongodb://localhost:27017/roommate'
    private db: Promise<mongoose.Mongoose>;

    static #instance: MongoDBClient;
    roomModel: Model<IRoomDocument>

    roomSchema: Schema = new Schema<IRoom>({
        room_number: { type: Number, required: true },
        id_string: { type: String, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: false },
        ews_info: {
            email: {type: String},
            tenant_id: {type: String}
        },
        device_ids: [{type: 'ObjectId', ref: 'Device' }]
    });


    constructor() {
        this.initDB().then(client => {
            this.roomModel = mongoose.model<IRoomDocument>('Room', this.roomSchema);
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

    //
    // async addDevice(device: IDevice): Promise<string> {
    //     const db = await this.getDb()
    //     const result:Promise<InsertOneResult> = db.collection<IDevice>(this.db_collection_devices).insertOne(device);
    //     return (await result).insertedId.toString()
    // }
    //
    // async deleteDevice(device_id: string): Promise<void> {
    //     const db = await this.getDb()
    //     const result = db.collection<IDevice>(this.db_collection_devices)
    //         .deleteMany({ device_id: device_id });
    // }
    //
    // async getDevice(device_id: string): Promise<WithId<IDevice> | null> {
    //     const db = await this.getDb()
    //     return db.collection<IDevice>(this.db_collection_devices).findOne({ "device.device_id": device_id })
    // }
    //
    // async getDevices(): Promise<WithId<IDevice>[]> {
    //     const db = await this.getDb()
    //     return db.collection<IDevice>(this.db_collection_devices).find().toArray()
    // }
    //
    // async getRoomForDevice(device_id: string): Promise<WithId<IRoom> | null> {
    //     const db = await this.getDb()
    //     return db.collection<IRoom>(this.db_collection_rooms).findOne({device_ids: device_id})
    // }
    //
    // async associateRoomWithDevice(device_id: string, room_id: string) {
    //     const db = await this.getDb()
    //     const result = db.collection<IRoom>(this.db_collection_rooms)
    //         .updateOne({_id: new ObjectId(room_id)}, { $push: { "device_ids": device_id} })
    // }
    //
    // async addPersonToRoom(person: IPerson, room_id: string) {
    //     const db = await this.getDb()
    //     const result = db.collection<IRoom>(this.db_collection_rooms)
    //         .updateOne({_id: new ObjectId(room_id)}, { $push: { "persons": person} })
    // }

    async updateRoom(id: string, room: IRoom) {
        await this.getDb()
        const result = this.roomModel.findByIdAndUpdate(id, room).exec()
        console.log(await result)
    }

    async addRoom(room: IRoom) {
        await this.getDb()
        const result = this.roomModel.create(room);
    }

    async deleteRoom(id: string) {
        await this.getDb()
        const result = this.roomModel.findByIdAndDelete(id).exec();
    }

    async getRooms(): Promise<Array<IRoom>> {
        await this.getDb()
        return this.roomModel.find({}).exec()

    }

    async getRoom(id: string): Promise<IRoom> {
        await this.getDb()
        return this.roomModel.findById(id).exec();
    }

    // async getOrganizations(): Promise<WithId<IOrganization>[]> {
    //     const db = await this.getDb()
    //     return db.collection<IOrganization>(this.db_collection_orgs).find().toArray()
    // }
    //
    // async getOrganizationById(id: String): Promise<WithId<IOrganization>> {
    //     const db = await this.getDb()
    //     return db.collection<IOrganization>(this.db_collection_orgs).findOne({"_id": id})
    // }
    //
    // async addOrganization(organization: IOrganization) {
    //     const db = await this.getDb()
    //     const result =  db.collection<IOrganization>(this.db_collection_orgs).insertOne(organization)
    // }
    //
    //
    // async addEWSUser(user: IEWSTenant) {
    //     const db = await this.getDb()
    //     const result = db.collection<IEWSTenant>(this.db_collection_orgs).insertOne(user);
    // }
    //
    // async getEWSUser(id: String) {
    //     const db = await this.getDb()
    //     return db.collection<IEWSTenant>(this.db_collection_orgs).findOne({"_id": id})
    // }

}