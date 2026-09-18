import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {IOrganization} from "../../../datamodels/IOrganization";
import {organizationBody} from "./schemas";
import {logoExists} from "../logos";

function isValidTimezone(timezone: string): boolean {
    try {
        new Intl.DateTimeFormat("en", {timeZone: timezone})
        return true
    } catch {
        return false
    }
}

const OrganizationRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {

    // The organization is a single object; PUT replaces it
    server.put<{ Body: IOrganization }>('/organization', {schema: {body: organizationBody}}, async (request, reply) => {
        const organization = request.body
        if (!isValidTimezone(organization.timezone)) {
            throw new AppError(`Unknown timezone "${organization.timezone}".`, 400)
        }
        if (!logoExists(organization.default_logo)) {
            throw new AppError(`Unknown logo "${organization.default_logo}". Upload it first.`, 400)
        }
        const result = await ConfigManager.instance.getDBClient().setOrganization(organization)
        // The server renders times in the organization's timezone (set at startup from the same value)
        process.env.TZ = result.timezone
        return result
    });


    server.get('/organization', {}, async (request, reply) => {
        const org = await ConfigManager.instance.getDBClient().getOrganization()
        if (!org) {
            throw new AppError("Not Found",404);
        }
        return org
    });
};
export default fp(OrganizationRoute);
