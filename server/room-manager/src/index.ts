import fastify from 'fastify'
import {FileDBClient} from "./db/FileDBClient";
import {data, getData, getImage, image} from "./routes/device-requests";

const server = fastify()

const dbClient: FileDBClient = FileDBClient.instance

dbClient.getOrganizationById("").then(org => {
    process.env.TZ = org.timezone;
})


server.register(data, { prefix: "/data" })
server.register(image, { prefix: "/image" })

server.listen({ port: 3001, host:'0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
