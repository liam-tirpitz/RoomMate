// Returned by GET /api/status, which is public so the login page can pick the sign-in method
export interface IServerStatus {
    storage: 'FILE' | 'SQLITE'
    writable: boolean
    version: string
    auth: 'token' | 'oidc'
}

// Returned by GET /api/auth/me
export interface IAuthInfo {
    authenticated: boolean
    // How this request was authenticated: bearer API_TOKEN or the OIDC session cookie
    method: 'token' | 'oidc'
    // Only for OIDC sessions
    user?: {name: string, email?: string}
}
