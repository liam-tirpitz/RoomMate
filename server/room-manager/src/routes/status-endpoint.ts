import {FastifyInstance, FastifyPluginAsync} from "fastify";
import {authMethod, isWritable} from "../auth/requireAuth";
import {IAuthInfo, IServerStatus} from "../../../datamodels/IServerStatus";

const {version} = require("../../package.json")

// Public: the login page reads it before anyone is signed in, to decide between the token field and OIDC
export const StatusRoute: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.get("/status", async (): Promise<IServerStatus> => {
        const writable = isWritable()
        return {storage: writable ? "SQLITE" : "FILE", writable, version, auth: authMethod()}
    })
}

// Behind requireAuth, so answering at all means the credentials are valid
export const AuthMeRoute: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.get("/auth/me", async (request): Promise<IAuthInfo> => ({
        authenticated: true,
        method: request.auth?.method ?? "token",
        user: request.auth?.user ? {name: request.auth.user.name, email: request.auth.user.email} : undefined,
    }))
}
