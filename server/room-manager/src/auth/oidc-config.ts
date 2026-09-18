// OIDC settings, read from the same environment variables as greenlight (rwth-dbis/infrastructure/greenlight).
// Only members of OIDC_ADMIN_GROUPS or users listed in OIDC_ADMIN_SUBS / OIDC_ADMIN_EMAILS may sign in,
// because everyone who signs in to RoomMate can change every sign.

export interface OidcConfig {
    clientId: string
    clientSecret: string
    authorizationEndpoint: string
    tokenEndpoint: string
    userinfoEndpoint: string
    jwksEndpoint: string
    // Checked against the ID token's iss claim when set
    issuer?: string
    signAlgo: string
    scopes: string
    // Where browsers reach this server, e.g. https://roommate.example.com
    publicUrl: string
    redirectUri: string
    adminGroups: string[]
    adminSubs: string[]
    adminEmails: string[]
    // Cookies are marked Secure when the public URL uses https
    secureCookies: boolean
}

type Env = Record<string, string | undefined>

const REQUIRED = [
    "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_AUTHORIZATION_ENDPOINT", "OIDC_TOKEN_ENDPOINT",
    "OIDC_USERINFO_ENDPOINT", "OIDC_JWKS_ENDPOINT", "PUBLIC_URL",
]

function list(...values: (string | undefined)[]): string[] {
    return values.flatMap(value => (value ?? "").split(",")).map(value => value.trim()).filter(value => value)
}

// null when OIDC is not configured (no OIDC_CLIENT_ID). Throws when it is configured only partly.
export function loadOidcConfig(env: Env = process.env): OidcConfig | null {
    if (!env.OIDC_CLIENT_ID?.trim()) {
        return null
    }
    const missing = REQUIRED.filter(name => !env[name]?.trim())
    if (missing.length) {
        throw new Error(`OIDC is configured (OIDC_CLIENT_ID is set) but ${missing.join(", ")} ${missing.length == 1 ? "is" : "are"} missing`)
    }
    let publicUrl: URL
    try {
        publicUrl = new URL(env.PUBLIC_URL.trim())
    } catch {
        throw new Error(`PUBLIC_URL "${env.PUBLIC_URL}" is not a URL`)
    }
    const base = publicUrl.origin + publicUrl.pathname.replace(/\/+$/, "")
    return {
        clientId: env.OIDC_CLIENT_ID.trim(),
        clientSecret: env.OIDC_CLIENT_SECRET.trim(),
        authorizationEndpoint: env.OIDC_AUTHORIZATION_ENDPOINT.trim(),
        tokenEndpoint: env.OIDC_TOKEN_ENDPOINT.trim(),
        userinfoEndpoint: env.OIDC_USERINFO_ENDPOINT.trim(),
        jwksEndpoint: env.OIDC_JWKS_ENDPOINT.trim(),
        issuer: env.OIDC_ISSUER?.trim() || undefined,
        signAlgo: env.OIDC_SIGN_ALGO?.trim() || "RS256",
        scopes: env.OIDC_SCOPES?.trim() || "openid profile email",
        publicUrl: base,
        redirectUri: `${base}/auth/callback`,
        adminGroups: list(env.OIDC_ADMIN_GROUPS),
        // INITIAL_ADMIN_SUB and INITIAL_ADMIN_EMAIL are accepted as in greenlight, as one more entry each
        adminSubs: list(env.OIDC_ADMIN_SUBS, env.INITIAL_ADMIN_SUB),
        adminEmails: list(env.OIDC_ADMIN_EMAILS, env.INITIAL_ADMIN_EMAIL).map(email => email.toLowerCase()),
        secureCookies: publicUrl.protocol == "https:",
    }
}

// Groups from the claims greenlight reads: groups, roles, or Azure AD's role claim; a list or comma-separated
export function groupsFromClaims(claims: Record<string, unknown>): string[] {
    const source = claims.groups ?? claims.roles ?? claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
    if (Array.isArray(source)) return source.map(String)
    if (typeof source == "string") return list(source)
    return []
}

// Keycloak sends group paths ("/roommate-admins") unless the mapper's "full group path" is off; accept both
function normalizeGroup(group: string): string {
    return group.replace(/^\/+/, "")
}

export function isAllowed(config: OidcConfig, claims: Record<string, unknown>): boolean {
    if (typeof claims.sub == "string" && config.adminSubs.includes(claims.sub)) {
        return true
    }
    // An address the provider has not verified could belong to anyone
    if (typeof claims.email == "string" && claims.email_verified !== false
        && config.adminEmails.includes(claims.email.toLowerCase())) {
        return true
    }
    const allowedGroups = config.adminGroups.map(normalizeGroup)
    return groupsFromClaims(claims).some(group => allowedGroups.includes(normalizeGroup(group)))
}
