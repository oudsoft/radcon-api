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
const parentDir = path.normalize(currentDir + '/..');
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
    var newPath = parentDir + PDF_DIR + '/'  + newFileName;
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
    var pageFullPath = parentDir + PDF_DIR + '/'  + pageCodeFile + '.html';
		var pdfFullPath = parentDir + PDF_DIR + '/'  + pageCodeFile + '.pdf';
    var command = parseStr('wkhtmltopdf -s A4 %s %s', pageFullPath, pdfFullPath);
    console.log(command);
    runcommand(command).then((stdout) => {
      console.log(stdout);
      resolve(PDF_PATH + '/' + pageCodeFile + '.pdf');
    }).catch((err) => {
      console.log('err: 500 >>', err);
      reject(err);
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
    var command = parseStr('rm %s/%s.bmp', parentDir + PDF_DIR, fileCode);
    command += parseStr(' && rm %s/%s.html', parentDir + PDF_DIR, fileCode);
    command += parseStr(' && rm %s/%s.pdf', parentDir + PDF_DIR, fileCode);
    console.log(command);
    runcommand(command).then((stdout) => {
      console.log(stdout);
    }).catch((err) => {
      console.log('err: 500 >>', err);
    });
  });
}

module.exports = function (app, wssocket) {

  app.post('/convertfromurl', function(req, res) {
    const rootname = req.originalUrl.split('/')[1];
		var body = req.body;
    var pageUrl = body.url;
    downloader(pageUrl).then((pageFileCode) => {
      convertor(pageFileCode).then((pdfUrl) => {
        res.status(200).send({status: {code: 200}, text: 'ok pdf.', pdf: {link: '/' + rootname + pdfUrl, filename: pageFileCode + '.pdf'}});
      });
    });
  });

  app.post('/convertpdffile', function(req, res) {
    /*
    const rootname = req.originalUrl.split('/')[1];
    var caseId = req.body.caseId;
    var hospitalId = req.body.hospitalId;
    var userId = req.body.userId;
    var filename = req.body.patientName;
    downloader(pageUrl, filename).then((pageFileCode) => {
      convertor(pageFileCode).then((pdfUrl) => {
        res.status(200).send({status: {code: 200}, text: 'ok pdf.', pdf: {link: '/' + rootname + pdfUrl, filename: pageFileCode + '.pdf'}});
      });
    });
    */
    //var filename = req.body.patientName;
    var pageFileCode = req.body.reportCode;
    convertor(pageFileCode).then((pdfUrl) => {
      res.status(200).send({status: {code: 200}, text: 'ok pdf.', pdf: {link: pdfUrl, filename: pageFileCode + '.pdf'}});
    });
  });

  app.post('/converttodicom', function(req, res) {
    const rootname = req.originalUrl.split('/')[1];
		var body = req.body;
    console.log(body);
    var command = 'curl --user ' + userpass + ' ' + ORTHANC_URL + '/studies/' + body.studyID;
    console.log(command);
    runcommand(command).then((stdout) => {
      console.log(stdout);
      let studyObj = JSON.parse(stdout);
			let mainTags = Object.keys(studyObj.MainDicomTags);
			let patientMainTags = Object.keys(studyObj.PatientMainDicomTags);
      let fileCode = body.pdfFileName.split('.')[0];
      let bpmFile = fileCode + '.bmp';
      let dcmFile = fileCode + '.dcm';
      command = '';
      command += 'convert -verbose -density 150 -trim ' + parentDir + PDF_DIR + '/' + body.pdfFileName + '[0]';
      command += ' -define bmp:format=BMP3 -quality 100 -flatten -sharpen 0x1.0 ';
      command += ' ' + parentDir + PDF_DIR + '/' + bpmFile;
      command += ' && cd ' + parentDir + PDF_DIR;
      command += ' && img2dcm -i BMP ' + fileCode + '.bmp' + ' ' + dcmFile;
      mainTags.forEach((tag, i) => {
        command += parseStr(' -k "%s=%s"', tag, Object.values(studyObj.MainDicomTags)[i]);
      });
      patientMainTags.forEach((tag, i) => {
        if (tag !== 'OtherPatientIDs')	{
          command += parseStr(' -k "%s=%s"', tag, Object.values(studyObj.PatientMainDicomTags)[i]);
        }
      });

      //command += ' -k "Modality=OT" -v';
      command += parseStr(' -k "Modality=%s" -v', body.modality);

      command += ' && storescu';
      command += parseStr(' %s %s', process.env.ORTHANC_DOMAIN, process.env.ORTHANC_DICOM_PORT);
      command +=  ' ' + fileCode + '.dcm';
      command +=  ' -v';

      console.log(command);

      runcommand(command).then((cmdout) => {
        console.log(cmdout);
        removeTempFile(fileCode);
        let cwss = wssocket.socket.clients;
        cwss.forEach((wc) => {
          if (wc.id == body.username) {
            let socketTrigger = {type: 'trigger', message: 'Please tell your orthanc update', studyid: body.studyID, dcmname: dcmFile};
            wc.send(JSON.stringify(socketTrigger));
          }
        });
        res.status(200).send({status: {code: 200}, dicom : {filename: '/' + rootname + PDF_DIR + '/' + dcmFile}});
      }).catch((cmderr) => {
        console.log('cmderr: 500 >>', cmderr);
        reject(cmderr);
      });
    }).catch((err) => {
      console.log('err: 500 >>', err);
      reject(err);
    });
  });

  app.post('/requestnotify', (req, res) => {
  	let userid = req.body.userid;
    let message = req.body.message;
    let cwss = wssocket.socket.clients;
    cwss.forEach((wc) => {
      if (wc.id == userid) {
        let socketMessage = {type: 'notify', message: message};
        wc.send(JSON.stringify(socketMessage));
      }
    });
  })

  return {
    runcommand
	}
}
