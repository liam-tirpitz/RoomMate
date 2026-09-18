import {FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest} from "fastify";
import crypto from "crypto";
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {FileDBClient} from "../db/FileDBClient";
import RoomRoute from "./room-endpoint";
import DeviceRoute from "./device-endpoint";
import EWSUserRoute from "./ewsuser-endpoint";
import OrganizationRoute from "./organization-endpoint";

// Devices can't authenticate, so only the management routes are protected. Without API_TOKEN they stay locked.
export async function requireApiToken(request: FastifyRequest, reply: FastifyReply) {
    const expected = process.env.API_TOKEN
    if (!expected) {
        throw new AppError("Management API is disabled. Set API_TOKEN to enable it.", 403)
    }
    const header = request.headers.authorization ?? ""
    const provided = header.startsWith("Bearer ") ? header.substring("Bearer ".length) : ""
    // Compare hashes so the comparison takes the same time regardless of the token length
    const matches = crypto.timingSafeEqual(
        crypto.createHash("sha256").update(provided).digest(),
        crypto.createHash("sha256").update(expected).digest())
    if (!matches) {
        reply.header("WWW-Authenticate", "Bearer")
        throw new AppError("Unauthorized", 401)
    }
}

// The file backend ignores writes, so tell the caller instead of answering with a success code
export async function rejectWritesOnFileBackend(request: FastifyRequest, reply: FastifyReply) {
    if (request.method != "GET" && ConfigManager.instance.getDBClient() instanceof FileDBClient) {
        throw new AppError("Writes are not supported with the file backend. Edit config/calendars.json instead.", 501)
    }
}

// Registers the management routes behind the checks above. Not wrapped in fastify-plugin, so the hooks stay in this scope.
export const ManagementApi: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.addHook("onRequest", requireApiToken)
    server.addHook("onRequest", rejectWritesOnFileBackend)
    server.register(RoomRoute)
    server.register(DeviceRoute)
    server.register(EWSUserRoute)
    server.register(OrganizationRoute)
}
