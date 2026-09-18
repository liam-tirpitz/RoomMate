import fs from "fs";
import path from "path";
import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import fastifyStatic from "@fastify/static";
import {Logging} from "../logging";

// The Angular build; the Docker image copies it here. Without it (local development) only the API runs.
export const PUBLIC_DIR = process.env.PUBLIC_DIR ?? "public"

// Paths that belong to the server; everything else is a route of the single-page app
const SERVER_PATHS = /^\/(api|data|image|auth)(\/|\?|$)/

function wantsHtml(request: FastifyRequest): boolean {
    return request.method == "GET" && (request.headers.accept ?? "").includes("text/html") && !SERVER_PATHS.test(request.url)
}

// Serves the web UI at /. Register it after the device endpoints and the API.
export async function registerWebUi(server: FastifyInstance, root = PUBLIC_DIR) {
    const index = path.resolve(root, "index.html")
    const hasUi = fs.existsSync(index)
    if (hasUi) {
        await server.register(fastifyStatic, {
            root: path.resolve(root),
            // Files are listed once at startup instead of matching every path
            wildcard: false,
            setHeaders: (res, filePath) => {
                // The build hashes asset names, so only index.html must be revalidated
                const cacheControl = path.basename(filePath) == "index.html" ? "no-cache" : "public, max-age=31536000, immutable"
                res.header("Cache-Control", cacheControl)
            },
        })
        Logging.instance.logger.info(`Serving the web UI from ${path.resolve(root)}`)
    } else {
        Logging.instance.logger.info(`No web UI in ${path.resolve(root)}, serving the API only`)
    }

    server.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
        if (hasUi && wantsHtml(request)) {
            // Deep links such as /rooms/4 are routed by the app
            return reply.header("Cache-Control", "no-cache").sendFile("index.html")
        }
        return reply.code(404).send({error: "Not Found"})
    })
}
