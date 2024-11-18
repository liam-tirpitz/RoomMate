import fastify from 'fastify'
import {FileDBClient} from "./db/FileDBClient";
import {dataEndpoint, imageEndpoint} from "./routes/device-requests";
import RoomRoute from "./routes/room-endpoint";
import DeviceRoute from "./routes/device-endpoint";
import EWSUserRoute from "./routes/ewsuser-endpoint";

const server = fastify()

const dbClient: FileDBClient = FileDBClient.instance

dbClient.getOrganizationById("").then(org => {
    process.env.TZ = org.timezone;
})


server.register(dataEndpoint, { prefix: "/data" })
server.register(imageEndpoint, { prefix: "/image" })
server.register(RoomRoute)
server.register(DeviceRoute)
server.register(EWSUserRoute)



server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
