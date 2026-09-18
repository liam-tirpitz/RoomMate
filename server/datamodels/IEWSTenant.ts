export interface IEWSTenant {
    id?: string
    identifier: string
    endpoint: string
    user: string
    // Name of the environment variable that holds the password
    secret: string
    // API responses only: whether that environment variable is set on the server
    secret_available?: boolean
}