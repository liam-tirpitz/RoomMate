import {
    FastifyInstance,
    FastifyPluginOptions,
    FastifyPluginAsync
} from 'fastify';

import fp from 'fastify-plugin';
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {IOrganization} from "../../../datamodels/IOrganization";



const OrganizationRoute: FastifyPluginAsync = async (server: FastifyInstance, options: FastifyPluginOptions) => {

    server.post<{ Body: IOrganization }>('/organization', {}, async (request, reply) => {
        const result = await ConfigManager.instance.getDBClient().setOrganization((await request).body)
        reply
            .code(201)
            .send(result)
    });


    server.get('/organization', {}, async (request, reply) => {
        const org = await ConfigManager.instance.getDBClient().getOrganization()
        if (!org) {
            throw new AppError("Not Found",404);
        }
        return JSON.stringify(await org)

    });
};
export default fp(OrganizationRoute);
