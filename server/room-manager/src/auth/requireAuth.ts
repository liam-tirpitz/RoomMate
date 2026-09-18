import {FastifyReply, FastifyRequest} from "fastify";
import crypto from "crypto";
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {FileDBClient} from "../db/FileDBClient";
import {Logging} from "../logging";
import {OidcConfig, loadOidcConfig} from "./oidc-config";
import {SessionCodec} from "./session";

export type AuthMethod = "token" | "oidc"

// What the session cookie holds after an OIDC sign-in
export interface IUserSession {
    sub: string
    name: string
    email?: string
}

declare module "fastify" {
    interface FastifyContextConfig {
        // The route changes nothing despite its method, so it also works on the read-only file backend
        allowOnFileBackend?: boolean
    }
    interface FastifyRequest {
        // Set by requireAuth
        auth?: {method: AuthMethod, user?: IUserSession}
    }
}

export const SESSION_COOKIE = "roommate_session"
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60

let oidcConfig: OidcConfig | null = null
let sessionCodec: SessionCodec | null = null

// Reads the OIDC settings; throws on an incomplete configuration so the server does not start half-secured
export function initAuth(env: Record<string, string | undefined> = process.env) {
    const config = loadOidcConfig(env)
    const {codec, generated} = SessionCodec.fromEnv(env)
    configureAuth(config, config ? codec : null)
    const logger = Logging.instance.logger
    if (config) {
        logger.info(`OIDC sign-in enabled, callback ${config.redirectUri}`)
        if (!config.adminGroups.length && !config.adminSubs.length && !config.adminEmails.length) {
            logger.warn("OIDC is enabled but OIDC_ADMIN_GROUPS, OIDC_ADMIN_SUBS and OIDC_ADMIN_EMAILS are empty, so nobody can sign in.")
        }
        if (generated) {
            logger.warn("SESSION_SECRET is not set; sessions end whenever the server restarts.")
        }
    }
    if (!config && !env.API_TOKEN) {
        logger.warn("Neither API_TOKEN nor OIDC is configured, the management API is disabled.")
    }
}

export function configureAuth(config: OidcConfig | null, codec: SessionCodec | null) {
    oidcConfig = config
    sessionCodec = codec
}

export function getOidcConfig(): OidcConfig | null {
    return oidcConfig
}

export function getSessionCodec(): SessionCodec | null {
    return sessionCodec
}

export function authMethod(): AuthMethod {
    return oidcConfig ? "oidc" : "token"
}

export function readSession(request: FastifyRequest): IUserSession | null {
    return sessionCodec?.open<IUserSession>(request.cookies?.[SESSION_COOKIE]) ?? null
}

function tokenMatches(provided: string, expected: string): boolean {
    // Compare hashes so the comparison takes the same time regardless of the token length
    return crypto.timingSafeEqual(
        crypto.createHash("sha256").update(provided).digest(),
        crypto.createHash("sha256").update(expected).digest())
}

// A cookie is sent with any request to this server, also from other sites. Requests that change something
// therefore have to come from the web UI's own origin; SameSite=Lax alone would still allow sibling subdomains.
function isSameOrigin(request: FastifyRequest): boolean {
    const origin = request.headers.origin
    return !!origin && !!oidcConfig && origin == new URL(oidcConfig.publicUrl).origin
}

// Devices can't authenticate, so only the management API is protected. Scripts send API_TOKEN as a bearer token,
// the web UI signs in with OIDC (session cookie) or, without OIDC, with API_TOKEN as well.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
    const expected = process.env.API_TOKEN
    const header = request.headers.authorization ?? ""
    if (header.startsWith("Bearer ")) {
        if (expected && tokenMatches(header.substring("Bearer ".length), expected)) {
            request.auth = {method: "token"}
            return
        }
    } else {
        const user = readSession(request)
        if (user) {
            if (request.method != "GET" && request.method != "HEAD" && !isSameOrigin(request)) {
                throw new AppError("Cross-site request refused", 403)
            }
            request.auth = {method: "oidc", user}
            return
        }
    }
    if (!expected && !oidcConfig) {
        throw new AppError("Management API is disabled. Set API_TOKEN or configure OIDC to enable it.", 403)
    }
    reply.header("WWW-Authenticate", "Bearer")
    throw new AppError("Unauthorized", 401)
}

export function isWritable(): boolean {
    return !(ConfigManager.instance.getDBClient() instanceof FileDBClient)
}

// The file backend ignores writes, so tell the caller instead of answering with a success code.
// Routes that change nothing despite their method opt out with config: {allowOnFileBackend: true}.
export async function rejectWritesOnFileBackend(request: FastifyRequest, reply: FastifyReply) {
    if (request.method != "GET" && !request.routeOptions.config?.allowOnFileBackend && !isWritable()) {
        throw new AppError("Writes are not supported with the file backend. Edit config/calendars.json instead.", 501)
    }
}
