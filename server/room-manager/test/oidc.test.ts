import {after, afterEach, before, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import fastify, {FastifyInstance} from "fastify";
import cookie from "@fastify/cookie";
import {SignJWT, exportJWK, generateKeyPair, KeyLike} from "jose";
import {ManagementApi} from "../src/routes/management-api";
import {OidcRoutes, safeReturnTo} from "../src/auth/oidc-routes";
import {configureAuth, initAuth} from "../src/auth/requireAuth";
import {isAllowed, loadOidcConfig} from "../src/auth/oidc-config";
import {SessionCodec} from "../src/auth/session";

const CLIENT_ID = "roommate"
const CLIENT_SECRET = "client-secret"
const PUBLIC_URL = "http://roommate.example.com"
const ISSUER = "https://sso.example.com/realms/main"

// A minimal OIDC provider: token, userinfo and JWKS endpoints. Tests set what it returns.
class FakeProvider {
    server: FastifyInstance
    url = ""
    key: KeyLike
    // From the authorization request, so the token endpoint can check PKCE and echo the nonce
    challenge = ""
    nonce = ""
    claims: Record<string, unknown> = {}
    idTokenOverrides: Record<string, unknown> = {}

    async start() {
        const {publicKey, privateKey} = await generateKeyPair("RS256")
        this.key = privateKey
        const jwk = {...await exportJWK(publicKey), kid: "test-key", alg: "RS256", use: "sig"}
        this.server = fastify()
        this.server.addContentTypeParser("application/x-www-form-urlencoded", {parseAs: "string"},
            (request, body, done) => done(null, Object.fromEntries(new URLSearchParams(body as string))))
        this.server.get("/jwks", async () => ({keys: [jwk]}))
        this.server.post<{ Body: Record<string, string> }>("/token", async (request, reply) => {
            const body = request.body
            const verifierHash = crypto.createHash("sha256").update(body.code_verifier ?? "").digest("base64url")
            if (body.code != "good-code" || body.client_secret != CLIENT_SECRET || verifierHash != this.challenge
                || body.redirect_uri != `${PUBLIC_URL}/auth/callback`) {
                return reply.code(400).send({error: "invalid_grant"})
            }
            // Overrides last, so a test can forge any claim
            const idToken = await new SignJWT({sub: String(this.claims.sub), iss: ISSUER, aud: CLIENT_ID, nonce: this.nonce, ...this.idTokenOverrides})
                .setProtectedHeader({alg: "RS256", kid: "test-key"})
                .setIssuedAt()
                .setExpirationTime("5m")
                .sign(this.key)
            return {id_token: idToken, access_token: "access-token", token_type: "Bearer"}
        })
        this.server.get("/userinfo", async (request, reply) => {
            if (request.headers.authorization != "Bearer access-token") return reply.code(401).send()
            return this.claims
        })
        this.url = await this.server.listen({port: 0, host: "127.0.0.1"})
    }
}

function setCookies(response): Record<string, {value: string, attrs: any}> {
    return Object.fromEntries(response.cookies.map(c => [c.name, {value: c.value, attrs: c}]))
}

describe("OIDC sign-in", () => {
    const provider = new FakeProvider()
    let server: FastifyInstance

    before(() => provider.start())
    after(() => provider.server.close())

    beforeEach(async () => {
        provider.claims = {sub: "user-1", name: "Ada Lovelace", email: "ada@example.com", email_verified: true, groups: ["/roommate-admins"]}
        provider.idTokenOverrides = {}
        process.env.API_TOKEN = "script-token"
        initAuth({
            API_TOKEN: "script-token",
            OIDC_CLIENT_ID: CLIENT_ID,
            OIDC_CLIENT_SECRET: CLIENT_SECRET,
            OIDC_AUTHORIZATION_ENDPOINT: `${ISSUER}/protocol/openid-connect/auth`,
            OIDC_TOKEN_ENDPOINT: `${provider.url}/token`,
            OIDC_USERINFO_ENDPOINT: `${provider.url}/userinfo`,
            OIDC_JWKS_ENDPOINT: `${provider.url}/jwks`,
            OIDC_ISSUER: ISSUER,
            OIDC_ADMIN_GROUPS: "roommate-admins",
            PUBLIC_URL,
            SESSION_SECRET: "test-session-secret",
        })
        server = fastify()
        server.register(cookie)
        server.register(ManagementApi, {prefix: "/api"})
        server.register(OidcRoutes, {prefix: "/auth"})
    })
    afterEach(async () => {
        configureAuth(null, null)
        delete process.env.API_TOKEN
        await server.close()
    })

    // Starts a sign-in and returns what the browser would carry to the callback
    async function startLogin(returnTo = "/rooms/4") {
        const response = await server.inject({method: "GET", url: `/auth/login?returnTo=${encodeURIComponent(returnTo)}`})
        assert.equal(response.statusCode, 302)
        const location = new URL(response.headers.location as string)
        provider.challenge = location.searchParams.get("code_challenge")
        provider.nonce = location.searchParams.get("nonce")
        const flow = setCookies(response).roommate_oidc
        return {location, state: location.searchParams.get("state"), flowCookie: `roommate_oidc=${flow.value}`, flow}
    }

    async function signIn(returnTo?: string) {
        const {state, flowCookie} = await startLogin(returnTo)
        return server.inject({method: "GET", url: `/auth/callback?code=good-code&state=${state}`, headers: {cookie: flowCookie}})
    }

    async function sessionCookie(): Promise<string> {
        const response = await signIn()
        return `roommate_session=${setCookies(response).roommate_session.value}`
    }

    it("tells the login page to use OIDC", async () => {
        const status = await server.inject({method: "GET", url: "/api/status"})
        assert.equal(status.json().auth, "oidc")
    })

    it("sends the browser to the provider with PKCE, state and nonce", async () => {
        const {location, flow} = await startLogin()
        assert.equal(location.origin + location.pathname, `${ISSUER}/protocol/openid-connect/auth`)
        assert.equal(location.searchParams.get("client_id"), CLIENT_ID)
        assert.equal(location.searchParams.get("redirect_uri"), `${PUBLIC_URL}/auth/callback`)
        assert.equal(location.searchParams.get("response_type"), "code")
        assert.equal(location.searchParams.get("scope"), "openid profile email")
        assert.equal(location.searchParams.get("code_challenge_method"), "S256")
        assert.ok(location.searchParams.get("state") && location.searchParams.get("nonce"))
        assert.equal(flow.attrs.httpOnly, true)
        assert.equal(flow.attrs.path, "/auth")
    })

    it("signs in an allowed user and returns to the requested page", async () => {
        const response = await signIn("/rooms/4")
        assert.equal(response.statusCode, 302)
        assert.equal(response.headers.location, "/rooms/4")
        const session = setCookies(response).roommate_session
        assert.equal(session.attrs.httpOnly, true)
        assert.equal(session.attrs.sameSite, "Lax")
        assert.equal(session.attrs.secure, undefined, "http PUBLIC_URL: no Secure flag")

        const me = await server.inject({method: "GET", url: "/api/auth/me", headers: {cookie: `roommate_session=${session.value}`}})
        assert.equal(me.statusCode, 200)
        assert.deepEqual(me.json(), {authenticated: true, method: "oidc", user: {name: "Ada Lovelace", email: "ada@example.com"}})
        const organization = await server.inject({method: "GET", url: "/api/organization", headers: {cookie: `roommate_session=${session.value}`}})
        assert.equal(organization.statusCode, 200)
    })

    it("refuses users outside the allowed groups", async () => {
        provider.claims = {...provider.claims, groups: ["/students"]}
        const response = await signIn()
        assert.equal(response.statusCode, 302)
        assert.match(decodeURIComponent(response.headers.location as string), /^\/login\?error=Ada Lovelace is not allowed/)
        assert.equal(setCookies(response).roommate_session, undefined)
    })

    it("refuses a mismatched state, a missing flow cookie and provider errors", async () => {
        const {flowCookie} = await startLogin()
        const wrongState = await server.inject({method: "GET", url: "/auth/callback?code=good-code&state=forged", headers: {cookie: flowCookie}})
        assert.match(wrongState.headers.location as string, /^\/login\?error=/)
        const {state} = await startLogin()
        const noCookie = await server.inject({method: "GET", url: `/auth/callback?code=good-code&state=${state}`})
        assert.match(noCookie.headers.location as string, /^\/login\?error=/)
        const providerError = await server.inject({method: "GET", url: "/auth/callback?error=access_denied&error_description=Denied"})
        assert.equal(providerError.headers.location, "/login?error=Denied")
    })

    it("refuses an ID token with another nonce, audience or issuer", async () => {
        for (const overrides of [{nonce: "replayed"}, {aud: "other-client"}, {iss: "https://evil.example.com"}]) {
            provider.idTokenOverrides = overrides
            const response = await signIn()
            assert.match(response.headers.location as string, /^\/login\?error=Signing%20in%20failed/, JSON.stringify(overrides))
            assert.equal(setCookies(response).roommate_session, undefined)
        }
    })

    it("refuses a code the provider does not accept", async () => {
        const {state, flowCookie} = await startLogin()
        const response = await server.inject({method: "GET", url: `/auth/callback?code=stolen-code&state=${state}`, headers: {cookie: flowCookie}})
        assert.match(response.headers.location as string, /^\/login\?error=Signing%20in%20failed/)
    })

    it("accepts changes only from the web UI's own origin", async () => {
        const cookieHeader = await sessionCookie()
        const url = "/api/devices/aabbccddeeff/redraw"
        const crossSite = await server.inject({method: "POST", url, headers: {cookie: cookieHeader, origin: "https://evil.example.com"}, payload: {}})
        assert.equal(crossSite.statusCode, 403)
        const noOrigin = await server.inject({method: "POST", url, headers: {cookie: cookieHeader}, payload: {}})
        assert.equal(noOrigin.statusCode, 403)
        // Past authentication; the file backend then refuses the write
        const sameSite = await server.inject({method: "POST", url, headers: {cookie: cookieHeader, origin: PUBLIC_URL}, payload: {}})
        assert.equal(sameSite.statusCode, 501)
    })

    it("still accepts API_TOKEN from scripts and rejects forged sessions", async () => {
        const script = await server.inject({method: "GET", url: "/api/auth/me", headers: {authorization: "Bearer script-token"}})
        assert.deepEqual(script.json(), {authenticated: true, method: "token"})
        const wrongToken = await server.inject({method: "GET", url: "/api/auth/me", headers: {authorization: "Bearer nope"}})
        assert.equal(wrongToken.statusCode, 401)
        const forged = new SessionCodec("another-secret").seal({sub: "x", name: "Mallory"}, 3600)
        const forgedSession = await server.inject({method: "GET", url: "/api/auth/me", headers: {cookie: `roommate_session=${forged}`}})
        assert.equal(forgedSession.statusCode, 401)
    })

    it("signs out by clearing the session cookie", async () => {
        const response = await server.inject({method: "GET", url: "/auth/logout", headers: {cookie: await sessionCookie()}})
        assert.equal(response.statusCode, 302)
        assert.equal(response.headers.location, "/login")
        const cleared = setCookies(response).roommate_session
        assert.equal(cleared.value, "")
    })
})

describe("OIDC configuration", () => {
    const complete = {
        OIDC_CLIENT_ID: "roommate", OIDC_CLIENT_SECRET: "s", OIDC_AUTHORIZATION_ENDPOINT: "https://sso/auth",
        OIDC_TOKEN_ENDPOINT: "https://sso/token", OIDC_USERINFO_ENDPOINT: "https://sso/userinfo",
        OIDC_JWKS_ENDPOINT: "https://sso/certs", PUBLIC_URL: "https://roommate.example.com/",
    }

    it("is off without OIDC_CLIENT_ID and refuses a partial configuration", () => {
        assert.equal(loadOidcConfig({}), null)
        assert.throws(() => loadOidcConfig({OIDC_CLIENT_ID: "roommate", PUBLIC_URL: "https://x"}), /OIDC_CLIENT_SECRET, .*OIDC_JWKS_ENDPOINT are missing/)
        assert.throws(() => loadOidcConfig({...complete, PUBLIC_URL: "not a url"}), /PUBLIC_URL/)
    })

    it("derives the callback and secure cookies from PUBLIC_URL and reads greenlight's admin variables", () => {
        const config = loadOidcConfig({...complete, INITIAL_ADMIN_SUB: "sub-1", INITIAL_ADMIN_EMAIL: "Boss@Example.com", OIDC_ADMIN_SUBS: "sub-2, sub-3"})
        assert.equal(config.redirectUri, "https://roommate.example.com/auth/callback")
        assert.equal(config.secureCookies, true)
        assert.equal(config.signAlgo, "RS256")
        assert.deepEqual(config.adminSubs, ["sub-2", "sub-3", "sub-1"])
        assert.deepEqual(config.adminEmails, ["boss@example.com"])
    })

    it("allows listed subjects, verified emails and groups with or without a leading slash", () => {
        const config = loadOidcConfig({...complete, OIDC_ADMIN_SUBS: "sub-1", OIDC_ADMIN_EMAILS: "boss@example.com", OIDC_ADMIN_GROUPS: "/admins,staff"})
        assert.equal(isAllowed(config, {sub: "sub-1"}), true)
        assert.equal(isAllowed(config, {sub: "x", email: "BOSS@example.com", email_verified: true}), true)
        assert.equal(isAllowed(config, {sub: "x", email: "boss@example.com", email_verified: false}), false)
        assert.equal(isAllowed(config, {sub: "x", groups: ["admins"]}), true)
        assert.equal(isAllowed(config, {sub: "x", groups: ["/staff"]}), true)
        assert.equal(isAllowed(config, {sub: "x", roles: "guest, staff"}), true)
        assert.equal(isAllowed(config, {sub: "x", groups: ["/students"]}), false)
    })

    it("only returns to paths of the app after signing in", () => {
        assert.equal(safeReturnTo("/rooms/4?x=1"), "/rooms/4?x=1")
        for (const value of ["//evil.example.com", "/\\evil.example.com", "https://evil.example.com", "rooms", "/auth/login", undefined]) {
            assert.equal(safeReturnTo(value), "/", String(value))
        }
    })
})

describe("SessionCodec", () => {
    it("opens only its own, unexpired and untampered values", async () => {
        const codec = new SessionCodec("secret")
        const sealed = codec.seal({sub: "a"}, 60)
        assert.deepEqual(codec.open(sealed), {sub: "a"})
        assert.equal(new SessionCodec("other").open(sealed), null)
        const tampered = Buffer.from(sealed, "base64url")
        tampered[tampered.length - 1] ^= 1
        assert.equal(codec.open(tampered.toString("base64url")), null)
        assert.equal(codec.open(codec.seal({sub: "a"}, -1)), null)
        assert.equal(codec.open("garbage"), null)
        assert.equal(codec.open(undefined), null)
    })
})
