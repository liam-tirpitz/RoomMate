import {FastifyInstance, FastifyPluginAsync} from "fastify";
import {AuthMethod, isWritable} from "../auth/requireAuth";
import {IServerStatus} from "../../../datamodels/IServerStatus";

const {version} = require("../../package.json")

// Public: the login page reads it before anyone is signed in, to decide between the token field and OIDC
export const StatusRoute: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.get("/status", async (): Promise<IServerStatus> => {
        const writable = isWritable()
        return {storage: writable ? "SQLITE" : "FILE", writable, version, auth: "token"}
    })
}

// Behind requireAuth, so answering at all means the credentials are valid
export const AuthMeRoute: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.get("/auth/me", async () => ({authenticated: true, method: "token" as AuthMethod}))
}
