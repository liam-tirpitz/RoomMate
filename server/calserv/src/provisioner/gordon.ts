// or
import {SerialPort, ReadlineParser, ReadyParser, DelimiterParser} from 'serialport'
// Create a port

const ssid = "RWTH-devices"
const endpoint = 'http://your-server.example.com:3001/'


function getMAC(port, parser): Promise<string>{
    return new Promise(function(resolve, reject) {
        port.write('wifi.getMAC\n', function () {
            parser.on('data', (data) => {
                resolve(data)
            })
        })
    });
}

function setCredentials(port, parser, ssid, psk): Promise<string>{
    return new Promise(function(resolve, reject) {
        port.write('wifi.setCredentials ' + ssid + ' ' + psk + '\n', function () {
            parser.on('data', (data) => {
                resolve(data)
            })
        })
    });
}

function setEndpoint(port, parser, endpoint): Promise<string>{
    return new Promise(function(resolve, reject) {
        port.write('config.setEndpoint ' + endpoint + '\n', function () {
            parser.on('data', (data) => {
                resolve(data)
            })
        })
    });
}

function restart(port, parser): Promise<string>{
    return new Promise(function(resolve, reject) {
        port.write('restart\n', function () {
            parser.on('data', (data) => {
                resolve(data)
            })
        })
    });
}




async function start() {
    const devices = await SerialPort.list()
    if (devices.length == 0) {
        console.log("No devices found!")
        return
    } else {
        for (const device of devices) {
            console.log(device)
            const port = new SerialPort({
                path: device.path,
                baudRate: 115200,
            }).setEncoding('utf8')
            const parser = port.pipe(new DelimiterParser(
                {delimiter: 'RoomMate>'})).setEncoding('utf8');

            port.on('open', function () {
                console.log('Port Open')
                port.set({
                    dtr: true,
                    rts: true
                });
            })

            const mac = ((await getMAC(port, parser)).split('\r\n')[1]).replace(/:/g, "")
            console.log(mac)
            const psk = process.env["PSK_" + mac]
            if (psk == undefined) {
                console.log("Please configure a PSK for this device first!")
            } else {
                console.log("Start provisioning")
                let answer = await setCredentials(port, parser, ssid, psk)
                console.log(answer)
                answer = await setEndpoint(port, parser, endpoint)
                console.log(answer)
                answer = await restart(port, parser)
            }
            port.close()
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function run() {
    while (true) {
        try {
            await start()
        } catch (e) {
            console.log(e)
        }
        await sleep(5000)
    }
}

run()