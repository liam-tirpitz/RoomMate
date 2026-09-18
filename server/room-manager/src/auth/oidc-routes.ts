import crypto from "crypto";
import {FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest} from "fastify";
import {createRemoteJWKSet, jwtVerify, JWTVerifyGetKey} from "jose";
import {Logging} from "../logging";
import {OidcConfig, isAllowed} from "./oidc-config";
import {IUserSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, getOidcConfig, getSessionCodec} from "./requireAuth";

// Holds state, nonce, PKCE verifier and the page to return to between /auth/login and /auth/callback
const FLOW_COOKIE = "roommate_oidc"
const FLOW_MAX_AGE_SECONDS = 10 * 60
// Clocks of this server and the provider may differ a little
const CLOCK_TOLERANCE_SECONDS = 60

interface IFlow {
    state: string
    nonce: string
    verifier: string
    returnTo: string
}

function random(): string {
    return crypto.randomBytes(32).toString("base64url")
}

// Only paths of this app; anything else could send the user to another site after signing in
export function safeReturnTo(value: unknown): string {
    return typeof value == "string" && /^\/(?![\/\\])/.test(value) && !value.startsWith("/auth/") ? value : "/"
}

function cookieOptions(config: OidcConfig, path: string, maxAge: number) {
    return {path, maxAge, httpOnly: true, sameSite: "lax" as const, secure: config.secureCookies}
}

// The login page shows the message
function failed(reply: FastifyReply, message: string) {
    return reply.redirect(`/login?error=${encodeURIComponent(message)}`)
}

async function fetchJson(url: string, init: RequestInit): Promise<any> {
    const response = await fetch(url, {...init, signal: AbortSignal.timeout(15_000)})
    const text = await response.text()
    if (!response.ok) {
        throw new Error(`${url} answered ${response.status}: ${text.slice(0, 200)}`)
    }
    return JSON.parse(text)
}

function displayName(claims: Record<string, any>): string {
    return claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(" ")
        || claims.preferred_username || claims.email || claims.sub
}

// Authorization code flow with PKCE, like greenlight's mozilla-django-oidc setup. Registered under /auth.
export const OidcRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
    const config = getOidcConfig()
    const codec = getSessionCodec()
    if (!config || !codec) return
    const jwks: JWTVerifyGetKey = createRemoteJWKSet(new URL(config.jwksEndpoint))

    server.get<{ Querystring: { returnTo?: string } }>("/login", async (request, reply) => {
        const flow: IFlow = {state: random(), nonce: random(), verifier: random(), returnTo: safeReturnTo(request.query.returnTo)}
        const url = new URL(config.authorizationEndpoint)
        url.search = new URLSearchParams({
            response_type: "code",
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: config.scopes,
            state: flow.state,
            nonce: flow.nonce,
            code_challenge: crypto.createHash("sha256").update(flow.verifier).digest("base64url"),
            code_challenge_method: "S256",
        }).toString()
        return reply
            .setCookie(FLOW_COOKIE, codec.seal(flow, FLOW_MAX_AGE_SECONDS), cookieOptions(config, "/auth", FLOW_MAX_AGE_SECONDS))
            .redirect(url.toString())
    })

    server.get<{ Querystring: Record<string, string> }>("/callback", async (request: FastifyRequest<{ Querystring: Record<string, string> }>, reply) => {
        const flow = codec.open<IFlow>(request.cookies?.[FLOW_COOKIE])
        reply.clearCookie(FLOW_COOKIE, {path: "/auth"})
        const {code, state, error, error_description} = request.query
        if (error) {
            Logging.instance.logger.warn("OIDC provider reported an error", {error, error_description})
            return failed(reply, error_description || error)
        }
        if (!flow || !state || state != flow.state || !code) {
            return failed(reply, "The sign-in expired or was started in another tab. Please sign in again.")
        }
        let claims: Record<string, any>
        try {
            const tokens = await fetchJson(config.tokenEndpoint, {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded", Accept: "application/json"},
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: config.redirectUri,
                    code_verifier: flow.verifier,
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                }),
            })
            const {payload} = await jwtVerify(tokens.id_token, jwks, {
                audience: config.clientId,
                issuer: config.issuer,
                algorithms: [config.signAlgo],
                clockTolerance: CLOCK_TOLERANCE_SECONDS,
            })
            if (payload.nonce != flow.nonce) {
                throw new Error("The ID token's nonce does not match")
            }
            // Group claims are often only added to userinfo
            const userinfo = await fetchJson(config.userinfoEndpoint, {headers: {Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json"}})
            if (userinfo.sub != payload.sub) {
                throw new Error("userinfo belongs to another subject than the ID token")
            }
            claims = {...payload, ...userinfo}
        } catch (err) {
            Logging.instance.logger.error("OIDC sign-in failed", {error: err.message})
            return failed(reply, "Signing in failed. Please try again or contact the administrator.")
        }

        if (!isAllowed(config, claims)) {
            Logging.instance.logger.warn("OIDC user is not allowed to sign in", {sub: claims.sub, email: claims.email})
            return failed(reply, `${displayName(claims)} is not allowed to manage RoomMate. Ask an administrator to add you to an allowed group.`)
        }
        const session: IUserSession = {sub: claims.sub, name: displayName(claims), email: claims.email}
        Logging.instance.logger.info("OIDC user signed in", {sub: session.sub, email: session.email})
        return reply
            .setCookie(SESSION_COOKIE, codec.seal(session, SESSION_MAX_AGE_SECONDS), cookieOptions(config, "/", SESSION_MAX_AGE_SECONDS))
            .redirect(flow.returnTo)
    })

    // Ends the RoomMate session only; the provider's own session stays, as in greenlight
    server.get("/logout", async (request, reply) => {
        return reply.clearCookie(SESSION_COOKIE, {path: "/"}).redirect("/login")
    })
}
