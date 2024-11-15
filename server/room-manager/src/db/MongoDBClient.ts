import {Db, MongoClient, ObjectId} from 'mongodb'
import {IDevice} from "../datamodels/IDevice";
import {IRoom} from "../datamodels/IRoom";
import {IOrganization} from "../datamodels/IOrganization";
import {IEWSTenant} from "../datamodels/IEWSTenant";
import {IPerson} from "../datamodels/IPerson";
import {IDBClient} from "./IDBClient";

export class MongoDBClient implements IDBClient {
    db_endpoint = 'mongodb://root:example@localhost:27017'
    db_name = 'roommate'
    db_collection_rooms = 'rooms'
    db_collection_orgs = 'orgs'
    db_collection_devices = 'devices'

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


    private async getDb(): Promise<Db> {
        if (this.client) {
            return this.client
        } else {
            this.client = (await MongoClient.connect(this.db_endpoint)).db(this.db_name)
            return this.client
        }
    }

    async addDevice(device: IDevice): Promise<void> {
        const db = await this.getDb()
        const result = db.collection<IDevice>(this.db_collection_devices).insertOne(device);
    }

    async deleteDevice(device_id: string): Promise<void> {
        const db = await this.getDb()
        const result = db.collection<IDevice>(this.db_collection_devices)
            .deleteMany({ device_id: device_id });
    }

    async getDevice(device_id: string): Promise<IDevice> {
        const db = await this.getDb()
        return db.collection<IDevice>(this.db_collection_devices).findOne({ "device.device_id": device_id })
    }

    async getDevices(): Promise<IDevice[]> {
        const db = await this.getDb()
        return db.collection<IDevice>(this.db_collection_devices).find().toArray()
    }

    async getRoomForDevice(device_id: string): Promise<IRoom> {
        const db = await this.getDb()
        return db.collection<IRoom>(this.db_collection_rooms).findOne({device_ids: device_id})
    }

    async associateRoomWithDevice(device_id: string, room_id: string) {
        const db = await this.getDb()
        const result = db.collection<IRoom>(this.db_collection_rooms)
            .updateOne({_id: new ObjectId(room_id)}, { $push: { "device_ids": device_id} })
    }

    async addPersonToRoom(person: IPerson, room_id: string) {
        const db = await this.getDb()
        const result = db.collection<IRoom>(this.db_collection_rooms)
            .updateOne({_id: new ObjectId(room_id)}, { $push: { "persons": person} })
    }

    async addRoom(room: IRoom) {
        const db = await this.getDb()
        const result = db.collection<IRoom>(this.db_collection_rooms).insertOne(room);
    }

    async deleteRoom(id: string) {
        const db = await this.getDb()
        const result = db.collection<IRoom>(this.db_collection_rooms)
            .deleteMany({ _id: new ObjectId(id)});
    }

    async getRooms(): Promise<IRoom[]> {
        const db = await this.getDb()
        return db.collection<IRoom>(this.db_collection_rooms).find().toArray()
    }

    async getRoom(id: string): Promise<IRoom> {
        const db = await this.getDb()
        const obID = new ObjectId(id)
        return db.collection<IRoom>(this.db_collection_rooms).findOne({"_id": obID})
    }

    async getOrganizations(): Promise<IOrganization[]> {
        const db = await this.getDb()
        return db.collection<IOrganization>(this.db_collection_orgs).find().toArray()
    }

    async getOrganizationById(id: String): Promise<IOrganization> {
        const db = await this.getDb()
        return db.collection<IOrganization>(this.db_collection_orgs).findOne({"_id": id})
    }

    async addOrganization(organization: IOrganization) {
        const db = await this.getDb()
        const result =  db.collection<IOrganization>(this.db_collection_orgs).insertOne(organization)
    }


    async addEWSUser(user: IEWSTenant) {
        const db = await this.getDb()
        const result = db.collection<IEWSTenant>(this.db_collection_orgs).insertOne(user);
    }

    async getEWSUser(id: String) {
        const db = await this.getDb()
        return db.collection<IEWSTenant>(this.db_collection_orgs).findOne({"_id": id})
    }

}