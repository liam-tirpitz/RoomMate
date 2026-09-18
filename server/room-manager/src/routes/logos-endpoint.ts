import fs from "fs";
import {FastifyInstance, FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';
import multipart from "@fastify/multipart";
import {AppError} from "../datamodels/AppError";
import {ConfigManager} from "../ConfigManager";
import {detectImageType, listLogos, logoExists, logoPath, logoWarnings, sanitizeLogoName} from "../logos";
import {loadImage} from "canvas";

interface logoParams {
    name: string;
}

const MAX_LOGO_BYTES = 1024 * 1024

function checkName(name: string) {
    if (!logoExists(name)) {
        throw new AppError("Not Found", 404)
    }
}

// Rooms and the organization that would lose their logo
async function logoUsers(name: string): Promise<string[]> {
    const client = ConfigManager.instance.getDBClient()
    const users = (await client.getRooms()).filter(room => room.logo == name).map(room => room.name)
    if ((await client.getOrganization())?.default_logo == name) {
        users.push("the organization's default logo")
    }
    return users
}

const LogosRoute: FastifyPluginAsync = async (server: FastifyInstance) => {
    await server.register(multipart, {limits: {fileSize: MAX_LOGO_BYTES, files: 1}})

    server.get('/logos', {}, async () => listLogos())

    server.get<{ Params: logoParams }>('/logos/:name', {}, async (request, reply) => {
        checkName(request.params.name)
        reply
            .header('Content-Type', /\.png$/i.test(request.params.name) ? 'image/png' : 'image/jpeg')
            .header('Cache-Control', 'no-cache')
            .send(fs.readFileSync(logoPath(request.params.name)))
    });

    // multipart/form-data with one file field. The name is derived from the file name, the type from the content.
    // An existing logo is only replaced with ?overwrite=true.
    server.post<{ Querystring: { overwrite?: boolean } }>('/logos', {
        schema: {querystring: {type: 'object', properties: {overwrite: {type: 'boolean', default: false}}}}
    }, async (request, reply) => {
        const file = await request.file()
        if (!file) {
            throw new AppError("Send the logo as a multipart/form-data file.", 400)
        }
        const data = await file.toBuffer().catch(error => {
            if (error.code == "FST_REQ_FILE_TOO_LARGE") {
                throw new AppError(`The logo is larger than ${MAX_LOGO_BYTES / 1024} KB.`, 413)
            }
            throw error
        })
        const type = detectImageType(data)
        if (!type) {
            throw new AppError("Only PNG and JPEG logos are supported.", 415)
        }
        let image
        try {
            image = await loadImage(data)
        } catch {
            throw new AppError("The file is not a readable image.", 400)
        }
        const name = sanitizeLogoName(file.filename, type)
        if (logoExists(name) && !request.query.overwrite) {
            throw new AppError(`A logo named "${name}" already exists. Send ?overwrite=true to replace it.`, 409)
        }
        fs.writeFileSync(logoPath(name), data)
        reply
            .code(201)
            .send({name, width: image.width, height: image.height, warnings: logoWarnings(image.width, image.height)})
    });

    server.delete<{ Params: logoParams }>('/logos/:name', {}, async (request, reply) => {
        checkName(request.params.name)
        const users = await logoUsers(request.params.name)
        if (users.length) {
            throw new AppError(`The logo is still used by ${users.join(", ")}.`, 409)
        }
        fs.unlinkSync(logoPath(request.params.name))
        reply
            .code(204)
            .send()
    });
};
export default fp(LogosRoute);
