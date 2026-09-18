import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {loadImage} from "canvas";
import {SpecialStateImageProcessor} from "../src/image_processing/SpecialStateImageProcessor";

describe("finalizeImage", () => {
    it("returns a PNG with exactly the pixels sent to the device", async () => {
        const processor = new SpecialStateImageProcessor()
        await processor.buildNewDeviceImage("aabbccddeeff", 3900)
        const {packed, png} = await processor.finalizeImage()

        // Turn the PNG the way the device gets it and pack it again
        const check = new SpecialStateImageProcessor()
        const image = await loadImage(png)
        assert.equal(image.width, check.screenWidth)
        assert.equal(image.height, check.screenHeight)
        check.ctx.drawImage(image, 0, 0)
        const pixels = check.ctx.getImageData(0, 0, check.screenWidth, check.screenHeight).data
        for (let i = 0; i < pixels.length; i += 4) {
            assert.ok(pixels[i] == 0 || pixels[i] == 255, `pixel ${i / 4} is not black or white: ${pixels[i]}`)
        }
        check.rotate(90)
        const rotated = check.ctx.getImageData(0, 0, check.screenHeight, check.screenWidth)
        const repacked = btoa(String.fromCharCode.apply(null, check.horizontal1bit(Array.from(rotated.data), check.screenHeight)))

        assert.equal(Buffer.from(packed, "base64").length, 48000)
        assert.equal(repacked, packed)
    })
})
