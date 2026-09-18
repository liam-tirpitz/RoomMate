import {FastifyReply, FastifyRequest} from "fastify";
import crypto from "crypto";
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {FileDBClient} from "../db/FileDBClient";

export type AuthMethod = "token" | "oidc"

// Devices can't authenticate, so only the management API is protected. Without API_TOKEN it stays locked.
// The OIDC session check will be added here; routes only ever reference requireAuth.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
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

export function isWritable(): boolean {
    return !(ConfigManager.instance.getDBClient() instanceof FileDBClient)
}

// The file backend ignores writes, so tell the caller instead of answering with a success code
export async function rejectWritesOnFileBackend(request: FastifyRequest, reply: FastifyReply) {
    if (request.method != "GET" && !isWritable()) {
        throw new AppError("Writes are not supported with the file backend. Edit config/calendars.json instead.", 501)
    }
}
