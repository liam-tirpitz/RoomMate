import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import fastify, {FastifyInstance} from "fastify";
import {dataEndpoint, imageEndpoint} from "../src/routes/state-endpoint";
import {ManagementApi} from "../src/routes/management-api";
import {registerWebUi} from "../src/routes/web-ui";

const HTML = {accept: "text/html,application/xhtml+xml"}

describe("web UI", () => {
    let server: FastifyInstance
    let root: string

    async function start(withUi: boolean) {
        root = fs.mkdtempSync(path.join(os.tmpdir(), "roommate-ui-"))
        if (withUi) {
            fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><title>RoomMate</title>")
            fs.writeFileSync(path.join(root, "main-ABCD1234.js"), "console.log('app')")
        }
        server = fastify()
        server.register(dataEndpoint, {prefix: "/data"})
        server.register(imageEndpoint, {prefix: "/image"})
        server.register(ManagementApi, {prefix: "/api"})
        await registerWebUi(server, root)
    }

    beforeEach(() => {
        server = undefined
    })
    afterEach(async () => {
        await server?.close()
        fs.rmSync(root, {recursive: true, force: true})
    })

    it("serves the app at / and revalidates index.html", async () => {
        await start(true)
        const response = await server.inject({method: "GET", url: "/", headers: HTML})
        assert.equal(response.statusCode, 200)
        assert.match(response.headers["content-type"] as string, /^text\/html/)
        assert.equal(response.headers["cache-control"], "no-cache")
        assert.match(response.body, /<title>RoomMate/)
    })

    it("serves hashed assets with a long cache lifetime", async () => {
        await start(true)
        const response = await server.inject({method: "GET", url: "/main-ABCD1234.js"})
        assert.equal(response.statusCode, 200)
        assert.match(response.headers["content-type"] as string, /javascript/)
        assert.match(response.headers["cache-control"] as string, /immutable/)
    })

    it("answers deep links of the app with index.html", async () => {
        await start(true)
        const response = await server.inject({method: "GET", url: "/rooms/4", headers: HTML})
        assert.equal(response.statusCode, 200)
        assert.match(response.body, /<title>RoomMate/)
    })

    it("keeps JSON 404s for the API, the device endpoints and missing files", async () => {
        await start(true)
        for (const url of ["/api/nothing", "/api", "/data/nothing", "/image/nothing"]) {
            const response = await server.inject({method: "GET", url, headers: HTML})
            assert.equal(response.statusCode, 404, url)
            assert.deepEqual(response.json(), {error: "Not Found"}, url)
        }
        const missingFile = await server.inject({method: "GET", url: "/missing-1234.js", headers: {accept: "*/*"}})
        assert.equal(missingFile.statusCode, 404)
        const post = await server.inject({method: "POST", url: "/rooms/4", headers: HTML})
        assert.equal(post.statusCode, 404)
    })

    it("leaves the device and API endpoints untouched", async () => {
        await start(true)
        const data = await server.inject({method: "GET", url: "/data?devid=000000000000", headers: HTML})
        assert.equal(data.statusCode, 404)
        assert.deepEqual(data.json(), {error: "Device-ID not found."})
        const status = await server.inject({method: "GET", url: "/api/status", headers: HTML})
        assert.equal(status.statusCode, 200)
        assert.equal(status.json().auth, "token")
    })

    it("runs without a built UI", async () => {
        await start(false)
        const response = await server.inject({method: "GET", url: "/", headers: HTML})
        assert.equal(response.statusCode, 404)
        assert.deepEqual(response.json(), {error: "Not Found"})
    })
})
