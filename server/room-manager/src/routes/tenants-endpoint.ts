import {IEWSTenant} from "../../../datamodels/IEWSTenant";
import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {EWSCalendarClient} from "../calendar-apis/ews";
import {isUniqueViolation, tenantBody} from "./schemas";

interface tenantParams {
    tenantId: string;
}

const CONNECTION_TEST_TIMEOUT_MS = 15_000

// secret is the name of an environment variable; its value is never stored or returned
function withSecretAvailable(tenant: IEWSTenant): IEWSTenant {
    return {...tenant, id: tenant.id ?? String(tenant.identifier), secret_available: !!process.env[tenant.secret]}
}

async function getTenant(id: string): Promise<IEWSTenant> {
    const tenant = await ConfigManager.instance.getDBClient().getEwsUser(id)
    if (!tenant) {
        throw new AppError("Not Found",404);
    }
    return tenant
}

// Names of the rooms and offices whose calendars use the tenant
async function roomsUsingTenant(id: string): Promise<string[]> {
    const rooms = await ConfigManager.instance.getDBClient().getRooms()
    return rooms
        .filter(room => room.ews_info?.tenant_id == id || room.persons?.some(person => person.ews_info?.tenant_id == id))
        .map(room => room.name)
}

function duplicateIdentifier(error: any, identifier: string): Error {
    return isUniqueViolation(error) ? new AppError(`A tenant named "${identifier}" already exists.`, 409) : error
}

const TenantsRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {
    server.get('/tenants', {}, async (request, reply) => {
        const tenants = await ConfigManager.instance.getDBClient().getEwsUsers()
        return tenants.map(withSecretAvailable)
    });

    server.post<{ Body: IEWSTenant }>('/tenants', {schema: {body: tenantBody}}, async (request, reply) => {
        try {
            const result = await ConfigManager.instance.getDBClient().addEwsUser(request.body)
            reply
                .code(201)
                .send(withSecretAvailable(result))
        } catch (error) {
            throw duplicateIdentifier(error, request.body.identifier)
        }
    });

    server.put<{ Params: tenantParams, Body: IEWSTenant }>('/tenants/:tenantId', {schema: {body: tenantBody}}, async (request, reply) => {
        let result: IEWSTenant
        try {
            result = await ConfigManager.instance.getDBClient().updateEwsUser(request.params.tenantId, request.body)
        } catch (error) {
            throw duplicateIdentifier(error, request.body.identifier)
        }
        if (!result) {
            throw new AppError("Not Found",404);
        }
        return withSecretAvailable(result)
    });

    server.get<{ Params: tenantParams }>('/tenants/:tenantId', {}, async (request, reply) => {
        return withSecretAvailable(await getTenant(request.params.tenantId))
    });

    server.delete<{ Params: tenantParams }>('/tenants/:tenantId', {}, async (request, reply) => {
        const ID = request.params.tenantId;
        await getTenant(ID)
        const users = await roomsUsingTenant(ID)
        if (users.length) {
            throw new AppError(`The tenant is still used by ${users.join(", ")}.`, 409)
        }
        await ConfigManager.instance.getDBClient().deleteEwsUser(ID)
        reply
            .code(204)
            .send()
    });

    // Signs in with the stored credentials. Answers 200 either way; ok says whether it worked.
    // Changes nothing, so it also works on the file backend.
    server.post<{ Params: tenantParams }>('/tenants/:tenantId/test', {config: {allowOnFileBackend: true}}, async (request, reply) => {
        const tenant = await getTenant(request.params.tenantId)
        try {
            const client = new EWSCalendarClient(tenant)
            let timer: NodeJS.Timeout
            const timeout = new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error("The Exchange server did not answer in time.")), CONNECTION_TEST_TIMEOUT_MS)
            })
            try {
                await Promise.race([client.testConnection(), timeout])
            } finally {
                clearTimeout(timer)
            }
            return {ok: true}
        } catch (error) {
            return {ok: false, error: error?.message || String(error)}
        }
    });
};
export default fp(TenantsRoute);
