import fs from "fs";
import path from "path";
import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import fastifyStatic from "@fastify/static";
import {Logging} from "../logging";

// The Angular build; the Docker image copies it here. Without it (local development) only the API runs.
export const PUBLIC_DIR = process.env.PUBLIC_DIR ?? "public"

// The web UI is off unless WEB_UI=true. The management API does not depend on it; API_TOKEN controls that.
export function isWebUiEnabled(): boolean {
    const value = (process.env.WEB_UI ?? "").trim().toLowerCase()
    if (value && value != "true" && value != "false") {
        Logging.instance.logger.warn(`Unknown WEB_UI "${process.env.WEB_UI}", the web UI stays disabled. Use true or false.`)
    }
    return value == "true"
}

export interface WebUiOptions {
    enabled?: boolean
    root?: string
}

// Paths that belong to the server; everything else is a route of the single-page app
const SERVER_PATHS = /^\/(api|data|image|auth)(\/|\?|$)/

function wantsHtml(request: FastifyRequest): boolean {
    return request.method == "GET" && (request.headers.accept ?? "").includes("text/html") && !SERVER_PATHS.test(request.url)
}

// Serves the web UI at / when enabled. Register it after the device endpoints and the API.
// Either way, unknown paths answer a JSON 404.
export async function registerWebUi(server: FastifyInstance, {enabled = isWebUiEnabled(), root = PUBLIC_DIR}: WebUiOptions = {}) {
    const hasUi = enabled && fs.existsSync(path.resolve(root, "index.html"))
    if (!enabled) {
        Logging.instance.logger.info("The web UI is disabled. Set WEB_UI=true to serve it.")
    } else if (hasUi) {
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
        if (!process.env.API_TOKEN) {
            Logging.instance.logger.warn("WEB_UI is enabled but API_TOKEN is not set, so nobody can sign in to the web UI.")
        }
    } else {
        Logging.instance.logger.warn(`WEB_UI is enabled but there is no build in ${path.resolve(root)}, serving the API only`)
    }

    server.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
        if (hasUi && wantsHtml(request)) {
            // Deep links such as /rooms/4 are routed by the app
            return reply.header("Cache-Control", "no-cache").sendFile("index.html")
        }
        return reply.code(404).send({error: "Not Found"})
    })
}
