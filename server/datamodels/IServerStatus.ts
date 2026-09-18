// Returned by GET /api/status, which is public so the login page can pick the sign-in method
export interface IServerStatus {
    storage: 'FILE' | 'SQLITE'
    writable: boolean
    version: string
    auth: 'token' | 'oidc'
}
