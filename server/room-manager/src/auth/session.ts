import crypto from "crypto";

// Sealed cookie values: AES-256-GCM encrypts and authenticates them, so the browser can neither read nor change them.
// The key comes from SESSION_SECRET. Without it a random key is used and every restart signs everybody out.
export class SessionCodec {
    private readonly key: Buffer

    constructor(secret: string) {
        this.key = crypto.createHash("sha256").update(secret).digest()
    }

    static fromEnv(env: Record<string, string | undefined> = process.env): {codec: SessionCodec, generated: boolean} {
        const secret = env.SESSION_SECRET?.trim()
        if (secret) {
            return {codec: new SessionCodec(secret), generated: false}
        }
        return {codec: new SessionCodec(crypto.randomBytes(32).toString("hex")), generated: true}
    }

    seal(value: object, maxAgeSeconds: number): string {
        const iv = crypto.randomBytes(12)
        const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv)
        const payload = JSON.stringify({value, exp: Date.now() + maxAgeSeconds * 1000})
        const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()])
        return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")
    }

    // null for anything that was not sealed with this key or has expired
    open<T>(sealed: string | undefined): T | null {
        if (!sealed) return null
        try {
            const data = Buffer.from(sealed, "base64url")
            if (data.length < 29) return null
            const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, data.subarray(0, 12))
            decipher.setAuthTag(data.subarray(12, 28))
            const payload = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"))
            return typeof payload.exp == "number" && payload.exp > Date.now() ? payload.value as T : null
        } catch {
            return null
        }
    }
}
