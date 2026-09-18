import {FastifyInstance, FastifyPluginAsync} from "fastify";
import {rejectWritesOnFileBackend, requireAuth} from "../auth/requireAuth";
import RoomRoute from "./room-endpoint";
import DeviceRoute from "./device-endpoint";
import EWSUserRoute from "./ewsuser-endpoint";
import OrganizationRoute from "./organization-endpoint";
import {AuthMeRoute, StatusRoute} from "./status-endpoint";

// Registered under /api. Everything except /status sits behind requireAuth.
// The protected routes are registered in their own scope (not fastify-plugin), so the hooks stay there.
export const ManagementApi: FastifyPluginAsync = async (server: FastifyInstance) => {
    server.register(StatusRoute)
    server.register(async (protectedApi: FastifyInstance) => {
        protectedApi.addHook("onRequest", requireAuth)
        protectedApi.addHook("onRequest", rejectWritesOnFileBackend)
        protectedApi.register(AuthMeRoute)
        protectedApi.register(RoomRoute)
        protectedApi.register(DeviceRoute)
        protectedApi.register(EWSUserRoute)
        protectedApi.register(OrganizationRoute)
    })
}
