import {Db, MongoClient, ObjectId} from 'mongodb'
import {IDevice} from "../datamodels/IDevice";
import {IRoom} from "../datamodels/IRoom";
import {IOrganization} from "../datamodels/IOrganization";
import {IEWSTenant} from "../datamodels/IEWSTenant";

export class MongoDBClient {
    db_endpoint = 'mongodb://root:example@localhost:27017'
    db_name = 'roommate'
    db_collection_rooms = 'rooms'
    db_collection_orgs = 'orgs'

    // db_collection_devices = 'devices'

    client: Db

    static #instance: MongoDBClient;

    constructor() {
    }

    public static get instance(): MongoDBClient {
        if (!MongoDBClient.#instance) {
            MongoDBClient.#instance = new MongoDBClient();
        }

        return MongoDBClient.#instance;
    }


    async getDb(): Promise<Db> {
        if (this.client) {
            return this.client
        } else {
            this.client = (await MongoClient.connect(this.db_endpoint)).db(this.db_name)
            return this.client
        }
    }

    // async addDevice(device: IDevice): Promise<void> {
    //     const db = await this.getDb()
    //     const result = db.collection<IDevice>(this.db_collection_devices).insertOne(device);
    // }
    //
    // async deleteDevice(device_id: string): Promise<void> {
    //     const db = await this.getDb()
    //     const result = db.collection<IDevice>(this.db_collection_devices).deleteMany({ device_id: device_id });
    // }
    //

    async getDevice(device_id: string): Promise<IDevice> {
        const db = await this.getDb()
        return db.collection<IDevice>(this.db_collection_rooms).findOne({ "device.device_id": device_id })
    }

    async getDevices(): Promise<IDevice[]> {
        const db = await this.getDb()
        return db.collection<IDevice>(this.db_collection_rooms).aggregate([
            {
                $unwind: '$devices'
            },
            {
                $project:
                    {
                        location:'$devices.location',
                        device_id:'$devices.device_id'
                    }
            }
        ]).toArray()
    }



    async getRoomForDevice(device_id: string): Promise<IRoom> {
        const db = await this.getDb()
        return db.collection<IRoom>(this.db_collection_rooms).findOne({"devices.device_id": device_id})
    }

    async getRoomList(): Promise<IRoom[]> {
        const db = await this.getDb()
        return db.collection<IRoom>(this.db_collection_rooms).find().toArray()
    }

    async getOrganizations(): Promise<IOrganization[]> {
        const db = await this.getDb()
        return db.collection<IOrganization>(this.db_collection_orgs).find().toArray()
    }

    async getOrganizationById(id: String): Promise<IOrganization> {
        const db = await this.getDb()
        const _id = new ObjectId(id)
        return db.collection<IOrganization>(this.db_collection_orgs).findOne({"_id": _id})
    }

    async addOrganization(organization: IOrganization) {
        const db = await this.getDb()
        return db.collection<IOrganization>(this.db_collection_orgs).insertOne(organization)
    }


    async addEWSUser(user: IEWSTenant) {
        const db = await this.getDb()
        return db.collection<IEWSTenant>(this.db_collection_orgs).insertOne(user);
    }

    async getEWSUser(id: String) {
        const db = await this.getDb()
        const _id = new ObjectId(id)
        return db.collection<IEWSTenant>(this.db_collection_orgs).findOne({"_id": _id})
    }

}