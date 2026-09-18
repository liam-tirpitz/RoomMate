import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import fastify, {FastifyInstance} from "fastify";
import {ManagementApi} from "../src/routes/management-api";
import {dataEndpoint} from "../src/routes/state-endpoint";

const TOKEN = "test-token"

describe("management API", () => {
    let server: FastifyInstance

    beforeEach(() => {
        delete process.env.API_TOKEN
        server = fastify()
        server.register(dataEndpoint, {prefix: "/data"})
        server.register(ManagementApi)
    })
    afterEach(async () => {
        delete process.env.API_TOKEN
        await server.close()
    })

    it("is disabled when no API_TOKEN is configured", async () => {
        const response = await server.inject({method: "GET", url: "/ewsusers", headers: {authorization: "Bearer "}})
        assert.equal(response.statusCode, 403)
    })

    it("rejects requests without the right token", async () => {
        process.env.API_TOKEN = TOKEN
        for (const authorization of [undefined, "Bearer wrong", TOKEN]) {
            const headers = authorization ? {authorization} : {}
            const response = await server.inject({method: "GET", url: "/ewsusers", headers})
            assert.equal(response.statusCode, 401, `authorization: ${authorization}`)
            assert.equal(response.headers["www-authenticate"], "Bearer")
        }
    })

    it("answers reads with the right token", async () => {
        process.env.API_TOKEN = TOKEN
        const response = await server.inject({method: "GET", url: "/organization", headers: {authorization: `Bearer ${TOKEN}`}})
        assert.equal(response.statusCode, 200)
        assert.equal(JSON.parse(response.body).timezone, "Europe/Berlin")
    })

    it("answers 501 to writes on the file backend", async () => {
        process.env.API_TOKEN = TOKEN
        for (const [method, url] of [["POST", "/rooms"], ["PUT", "/devices/1"], ["DELETE", "/ewsusers/1"], ["POST", "/organization"]] as const) {
            const response = await server.inject({method, url, headers: {authorization: `Bearer ${TOKEN}`}, payload: {}})
            assert.equal(response.statusCode, 501, `${method} ${url}`)
        }
    })

    it("leaves the device endpoints open", async () => {
        process.env.API_TOKEN = TOKEN
        const response = await server.inject({method: "GET", url: "/data?devid=000000000000"})
        assert.equal(response.statusCode, 404)
    })
})
