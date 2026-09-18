import fs from "fs";
import path from "path";
import {loadImage} from "canvas";
import {ILogo} from "../../datamodels/ILogo";

// Logos live next to calendars.json; drawHeader loads them from ./config/<name>
let logoDir = "config"
// Any plain file name, so logos from existing configs stay usable. Uploads get stricter names (sanitizeLogoName).
export const LOGO_NAME_PATTERN = /^(?!\.)[^/\\]+\.(png|jpe?g)$/i
// drawHeader draws the logo at (0,0) and the room number starts at x = 248
export const LOGO_MAX_WIDTH = 240
export const LOGO_MAX_HEIGHT = 100


// Tests use a temporary directory
export function setLogoDir(dir: string) {
    logoDir = dir
}

export function logoPath(name: string): string {
    if (!LOGO_NAME_PATTERN.test(name)) {
        throw new Error(`Invalid logo name "${name}"`)
    }
    return path.join(logoDir, name)
}

export function logoExists(name: string): boolean {
    return LOGO_NAME_PATTERN.test(name ?? "") && fs.existsSync(logoPath(name))
}

export function logoWarnings(width: number, height: number): string[] {
    const warnings = []
    if (width > LOGO_MAX_WIDTH) {
        warnings.push(`The logo is ${width} px wide and will overlap the room number; keep it at most ${LOGO_MAX_WIDTH} px wide.`)
    }
    if (height > LOGO_MAX_HEIGHT) {
        warnings.push(`The logo is ${height} px tall and will reach into the content below the header; keep it at most ${LOGO_MAX_HEIGHT} px tall.`)
    }
    return warnings
}

export async function describeLogo(name: string): Promise<ILogo> {
    const image = await loadImage(logoPath(name))
    return {name, width: image.width, height: image.height, warnings: logoWarnings(image.width, image.height)}
}

export async function listLogos(): Promise<ILogo[]> {
    const names = fs.existsSync(logoDir) ? fs.readdirSync(logoDir).filter(name => LOGO_NAME_PATTERN.test(name)).sort() : []
    const logos = []
    for (const name of names) {
        try {
            logos.push(await describeLogo(name))
        } catch {
            // Not a readable image; it cannot be drawn either, so leave it out
        }
    }
    return logos
}

// The upload's file name is only a hint: the type comes from the content, the name is reduced to [a-z0-9_-]
export function detectImageType(data: Buffer): "png" | "jpg" | null {
    if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png"
    if (data[0] == 0xff && data[1] == 0xd8 && data[2] == 0xff) return "jpg"
    return null
}

export function sanitizeLogoName(filename: string, type: "png" | "jpg"): string {
    const base = path.basename(filename ?? "").replace(/\.[^.]*$/, "").toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
    return `${base || "logo"}.${type}`
}
