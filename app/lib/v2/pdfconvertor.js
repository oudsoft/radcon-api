/* pdfconvertor.js */
const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const exec = require('child_process').exec;
const cron = require('node-cron');

const PDF_PATH = process.env.USRPDF_PATH;
const PDF_DIR = process.env.USRPDF_DIR;
const ORTHANC_URL = 'http://' + process.env.ORTHANC_DOMAIN + ':' + process.env.ORTHANC_REST_PORT;
const currentDir = __dirname;
const publicDir = path.normalize(currentDir + '/../../..');
const userpass = process.env.ORTHANC_USER + ':' + process.env.ORTHANC_PASSWORD;

const parseStr = function (str) {
    var args = [].slice.call(arguments, 1),
        i = 0;
    return str.replace(/%s/g, () => args[i++]);
}

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
    });
	});
}

const downloader = function (url, pdffilename) {
	return new Promise(function(resolve, reject) {
    var newCodeFile;
    if (pdffilename) {
      newCodeFile = pdffilename;
    } else {
      newCodeFile = genUniqueID();
    }
    var newFileName = newCodeFile + '.html';
    var newPath = publicDir + PDF_DIR + '/'  + newFileName;
    var command = parseStr('curl -o %s %s', newPath, url);
    console.log(command);
    runcommand(command).then((stdout) => {
      console.log(stdout);
      resolve(newCodeFile);
    }).catch((err) => {
      console.log('err: 500 >>', err);
      reject(err);
    });
  });
}

const convertor = function (pageCodeFile) {
  return new Promise(async function(resolve, reject) {
    var pageFullPath = publicDir + PDF_DIR + '/'  + pageCodeFile + '.html';
		var pdfFullPath = publicDir + PDF_DIR + '/'  + pageCodeFile + '.pdf';
    var command = parseStr('wkhtmltopdf -s A4 %s %s', pageFullPath, pdfFullPath);
    console.log(command);
    runcommand(command).then((stdout) => {
      console.log(stdout);
      let pngFullPath = publicDir + PDF_DIR + '/'  + pageCodeFile + '.png';
      var command = parseStr('convert -density 300 -depth 8 -quality 85 %s %s', pdfFullPath, pngFullPath);
      console.log(command);
      runcommand(command).then((stdout) => {
        console.log(stdout);
        resolve({pdf: PDF_PATH + '/' + pageCodeFile + '.pdf', png: PDF_PATH + '/' + pageCodeFile + '.png'});
      }).catch((err) => {
        console.log('err: 500 >>', err);
        reject(err);
      });
    }).catch((err) => {
      console.log('err: 500 >>', err);
      reject(err);
    });
  });
}

const appendRadconLink = function(pageFullPath, link){
  return new Promise(async function(resolve, reject) {
    fs.readFile(pageFullPath, (e, html) => {
      fs.unlink(pageFullPath, function (err) {
        if (err) reject(err);
        const cheerio = require('cheerio');
        const $ = cheerio.load(html, { decodeEntities: false});
        $('body').append('<div style="position:absolute;right:5px;top:5px;font-size:14px;"><a href="' + link + '">' + link + '</a></div>');
        $('body').append('<div style="position:absolute;right:5px;top:35px;font-size:14px;">click ที่ link หากต้องการติดต่อรังสีแพทย์</div>');
        var writerStream = fs.createWriteStream(pageFullPath);
        var modifyHtml = $.html();
        writerStream.write(modifyHtml);
        writerStream.end();
        writerStream.on('finish', function() { console.log("Write Report HTML file completed."); });
        writerStream.on('error', function(err){ console.log(err.stack); });
        resolve(pageFullPath);
      });
    });
  });
}

const removeTempFile = function(fileCode) {
  const removeAfter = 10; /*minutes */
  const startDate = new Date();
  let endDate = new Date(startDate.getTime() + (removeAfter * 60 * 1000));
  let endMM = endDate.getMonth() + 1;
  let endDD = endDate.getDate();
  let endHH = endDate.getHours();
  let endMN = endDate.getMinutes();
  let endSS = endDate.getSeconds();
  let scheduleRemove = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
	let task = cron.schedule(scheduleRemove, function(){
    var command = parseStr('rm %s/%s.bmp', publicDir + PDF_DIR, fileCode);
    command += parseStr(' && rm %s/%s.html', publicDir + PDF_DIR, fileCode);
    command += parseStr(' && rm %s/%s.pdf', publicDir + PDF_DIR, fileCode);
    console.log(command);
    runcommand(command).then((stdout) => {
      console.log(stdout);
    }).catch((err) => {
      console.log('err: 500 >>', err);
    });
  });
}

module.exports = function (app) {

  app.post('/v2/convertfromurl', function(req, res) {
		var body = req.body;
    var pageUrl = body.url;
    var caseId = body.caseId;
    downloader(pageUrl).then((pageFileCode) => {
      var pageFullPath = publicDir + PDF_DIR + '/'  + pageFileCode + '.html';
      var radconLink = 'https://radconnext.info/v2/caseinfo.html?caseId=' + caseId;
      appendRadconLink(pageFullPath, radconLink).then((newPageFullPath) =>{
        convertor(pageFileCode).then((pdfUrl) => {
          res.status(200).send({status: {code: 200}, text: 'ok pdf.', pdf: {link: pdfUrl.pdf, filename: pageFileCode + '.pdf'}, png: {link: pdfUrl.png, filename: pageFileCode + '.png'}});
        });
      });
    });
  });

  app.post('/v2/convertpdffile', function(req, res) {
		var body = req.body;
    var pageUrl = body.url;
    var filename = body.name + '-' + body.date;
    var caseId = body.caseId;
    downloader(pageUrl, filename).then((pageFileCode) => {
      var pageFullPath = publicDir + PDF_DIR + '/'  + pageFileCode + '.html';
      var radconLink = 'https://radconnext.info/v2/caseinfo.html?caseId=' + caseId;
      appendRadconLink(pageFullPath, radconLink).then((newPageFullPath) =>{
        convertor(pageFileCode).then((pdfUrl) => {
          res.status(200).send({status: {code: 200}, text: 'ok pdf.', pdf: {link: pdfUrl.pdf, filename: pageFileCode + '.pdf'}, png: {link: pdfUrl.png, filename: pageFileCode + '.png'}});
        });
      });
    });
  });

  return {
    runcommand
	}
}
