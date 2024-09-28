const {registerFont, createCanvas, loadImage } = require('canvas')
const fs = require('fs')




async function drawOccupied(ctx, summary, organizer, timestring) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 106, 480, 169);
    ctx.font = '18pt "HNB"'
    ctx.fillStyle = "rgba(255, 255, 255, 1";
    ctx.fillText(summary, 32, 160)
    ctx.font = '18pt "HNL"'
    ctx.fillText(organizer, 32, 186)
    ctx.font = '18pt "HNB"'
    ctx.fillText(timestring, 32, 242)
}

async function drawOccupiedUnknown(ctx, end) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 106, 480, 169);
    ctx.font = '42pt "HNB"'
    ctx.fillStyle = "rgba(255, 255, 255, 1";
    ctx.fillText("Booked", 32, 202)
    ctx.font = '18pt "HNB"'
    ctx.fillText("Until " + end, 32, 242)
}

async function drawHeader(ctx, room_name, room_number) {
    const img = await loadImage('template.png')
    ctx.drawImage(img, 0, 0)

    ctx.font = '21pt "HNB"'
    ctx.fillText(room_name, 248, 62)

    ctx.font = '15pt "HNB"'
    ctx.fillText(room_number, 248, 83)


}


async function doImageThings() {
    registerFont('fonts/HelveticaNeueLTCom-Bd.ttf', { family: 'HNB' })
    registerFont('fonts/HelveticaNeueLTCom-Lt.ttf', { family: 'HNL' })

    const canvas = createCanvas(480, 800)
    const ctx = canvas.getContext('2d')

    await drawHeader(ctx, 'Meeting Room', '1000.0')
    // await drawOccupied(ctx, '[IDB] Status Meeting with HiWis', 'Liam Tirpitz', '9:00 - 10:00')
    await drawOccupiedUnknown(ctx, "10:00")






    const out = fs.createWriteStream( 'out.png')
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () =>  console.log('The PNG file was created.'))
    // PImage.decodePNGFromStream(fs.createReadStream("template.png")).then(
    //     (img) => {
    //         // var fnt = PImage.registerFont(
    //         //     "./fonts/HelveticaNeueLtCom-Bd.ttf",
    //         //     "HN Bold",
    //         // );
    //         // fnt.loadSync();
    //
    //         var fnt2 = PImage.registerFont(
    //             "./fonts/HelveticaNeueLtCom-lt.ttf",
    //             "HN asd",
    //         );
    //         fnt2.loadSync();
    //
    //             console.log("size is", img.width, img.height);
    //         var ctx = img.getContext("2d");
    //         ctx.fillStyle = "rgba(0, 25, 234, 0.6";
    //         ctx.font = "28pt 'HN Light'";
    //         ctx.fillText("Meeting Room", 248, 62);
    //         // ctx.font = "28pt 'HN Bold'";
    //         // ctx.fillText("Meeting Room", 248, 62);
    //
    //         PImage.encodePNGToStream(img, fs.createWriteStream("out.png"))
    //             .then(() => {
    //                 console.log("wrote out the png file to out.png");
    //             })
    //             .catch((e) => {
    //                 console.log("there was an error writing");
    //             });
    //     }
    // )
}

doImageThings().then()
