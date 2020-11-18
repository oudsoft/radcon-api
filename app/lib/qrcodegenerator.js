const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const publicDir = path.normalize(__dirname + '/../../public');
const qrcodePath = process.env.USRQRCODE_PATH;

const QRGen = (QRContent, filecode) => {
  return new Promise(async function(resolve, reject) {
    const {registerFont, createCanvas, createImageData} = require('canvas');
    const qrcodeCanvas = createCanvas(400, 400);
    const imageCanvas = createCanvas(400, 400);
    const ctx = imageCanvas.getContext('2d');
    QRCode.toCanvas(qrcodeCanvas, QRContent, function (error) {
  		ctx.drawImage(qrcodeCanvas, 0, 0, 400, 400);
      const imageLink = qrcodePath + '/' + filecode + '.png'
      const imagePath = publicDir + imageLink;
      const out = fs.createWriteStream(imagePath);
  		const stream = imageCanvas.createPNGStream();
  		stream.pipe(out);
      out.on('finish', () =>  {
  			resolve({qrlink: imageLink});
  		});
    });
  });
};

module.exports = QRGen;
