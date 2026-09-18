// Gordon provisions RoomMates connected via USB with WiFi credentials and the server endpoint.
// The PSK of each device is read from the environment variable PSK_<MAC without colons>.
import {SerialPort, DelimiterParser} from 'serialport'

const ssid = process.env.GORDON_SSID
const endpoint = process.env.GORDON_ENDPOINT

// USB-to-serial bridge of the Adafruit Feather ESP32 V2 (WCH CH9102F)
const SUPPORTED_USB_IDS = [{vendorId: "1a86", productId: "55d4"}]
const PROMPT = 'RoomMate>'
const COMMAND_TIMEOUT_MS = 5000
const POLL_INTERVAL_MS = 5000
const MAC_PATTERN = /([0-9A-F]{2}:){5}[0-9A-F]{2}/i

// Sends a command and resolves with the console output up to the next prompt
function sendCommand(port: SerialPort, parser: DelimiterParser, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const onData = (data: string) => {
            clearTimeout(timer)
            resolve(data)
        }
        const timer = setTimeout(() => {
            parser.off('data', onData)
            reject(new Error(`No answer to "${command.split(' ')[0]}" within ${COMMAND_TIMEOUT_MS} ms`))
        }, COMMAND_TIMEOUT_MS)
        parser.once('data', onData)
        port.write(command + '\n')
    })
}

function openPort(path: string): Promise<SerialPort> {
    return new Promise((resolve, reject) => {
        const port = new SerialPort({path: path, baudRate: 115200}, (err) => {
            if (err) return reject(err)
            port.set({dtr: true, rts: true}, () => resolve(port))
        })
    })
}

function closePort(port: SerialPort): Promise<void> {
    return new Promise((resolve) => port.isOpen ? port.close(() => resolve()) : resolve())
}

function isSupportedDevice(port: {vendorId?: string, productId?: string}): boolean {
    return SUPPORTED_USB_IDS.some(id =>
        port.vendorId?.toLowerCase() == id.vendorId && port.productId?.toLowerCase() == id.productId)
}

// The first answer can still be the boot banner, so ask a few times
async function readMAC(port: SerialPort, parser: DelimiterParser): Promise<string | undefined> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const answer = await sendCommand(port, parser, 'wifi.getMAC').catch(() => "")
        const mac = answer.match(MAC_PATTERN)?.[0]
        if (mac) return mac
    }
    return undefined
}

async function provision(path: string) {
    const port = await openPort(path)
    port.setEncoding('utf8')
    const parser = port.pipe(new DelimiterParser({delimiter: PROMPT})).setEncoding('utf8')
    try {
        const mac = await readMAC(port, parser)
        if (!mac) {
            console.log(`${path}: not a RoomMate, skipping`)
            return
        }
        const devid = mac.replace(/:/g, "")
        const psk = process.env["PSK_" + devid] ?? process.env["PSK_" + devid.toLowerCase()]
        if (psk == undefined) {
            console.log(`${path}: please configure PSK_${devid.toLowerCase()} for ${mac} first!`)
            return
        }
        console.log(`${path}: provisioning ${mac}`)
        console.log(await sendCommand(port, parser, `wifi.setCredentials ${ssid} ${psk}`))
        console.log(await sendCommand(port, parser, `config.setEndpoint ${endpoint}`))
        // The device restarts before it prints a new prompt, so a missing answer is expected here
        await sendCommand(port, parser, 'restart').catch(() => undefined)
        console.log(`${path}: ${mac} provisioned`)
    } finally {
        await closePort(port)
    }
}

async function run() {
    if (!ssid || !endpoint) {
        console.log("Please set GORDON_SSID and GORDON_ENDPOINT, e.g. GORDON_ENDPOINT=http://your-server.example.com:3001/")
        process.exit(1)
    }
    // Ports that were already handled. A port is provisioned again only after it was disconnected.
    const handled = new Set<string>()
    console.log("Waiting for RoomMates on USB...")
    while (true) {
        const ports = (await SerialPort.list()).filter(isSupportedDevice)
        const connected = new Set(ports.map(port => port.path))
        for (const path of handled) {
            if (!connected.has(path)) handled.delete(path)
        }
        for (const port of ports) {
            if (handled.has(port.path)) continue
            handled.add(port.path)
            try {
                await provision(port.path)
            } catch (e) {
                console.log(`${port.path}: ${e.message}`)
            }
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
}

run()
