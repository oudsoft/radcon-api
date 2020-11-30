const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var websocket, db, Report, Case, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const genUniqueID = function () {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + '-' + s4();
}

const parseStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		const exec = require('child_process').exec;
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				resolve(`${stdout}`);
			} else {
				reject(`${stderr}`);
			}
    });
	});
}

const doLoadVariable = function(caseId, userId){
  return new Promise(async function(resolve, reject) {
    const userInclude = [{model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH']}];
    const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
    try {
      const cases = await Case.findAll({include: caseInclude, where: {id: caseId}});
      const refes = await db.users.findAll({include: userInclude, where: {id: cases[0].Case_RefferalId}});
      const rades = await db.users.findAll({include: userInclude, where: {id: cases[0].Case_RadiologistId}});
      const caseRes = await db.caseresponses.findAll({attributes: ['id', 'Response_Text', 'updatedAt'], where: {caseId: caseId}});
      const PatientFullNameEN = cases[0].patient.Patient_NameEN + ' ' + cases[0].patient.Patient_LastNameEN;
      const PatientFullNameTH = cases[0].patient.Patient_NameTH + ' ' + cases[0].patient.Patient_LastNameTH;
      let PatientFullNameENTH;
      if (PatientFullNameEN) {
        PatientFullNameENTH = PatientFullNameEN;
      } else {
        PatientFullNameENTH = PatientFullNameTH;
      }
      const variable = {
        hospital_name: cases[0].hospital.Hos_Name,
        patient_name: PatientFullNameEN,
        patient_name_th: PatientFullNameTH,
        patient_name_en_th: PatientFullNameENTH,
        patient_hn: cases[0].patient.Patient_HN,
        patient_gender: cases[0].patient.Patient_Sex,
        patient_age: cases[0].patient.Patient_Age,
        patient_rights: cases[0].cliameright.CR_Name,
        patient_dept: cases[0].Case_Department,
        patient_doctor: refes[0].userinfo.User_NameTH + ' ' + refes[0].userinfo.User_LastNameTH,
        scan_date: cases[0].createdAt,
        scan_protocol: cases[0].Case_ProtocolName,
        report_by: rades[0].userinfo.User_NameTH + ' ' + rades[0].userinfo.User_LastNameTH,
        result: caseRes[0].Response_Text,
        report_datetime: caseRes[0].updatedAt
      }
      resolve(variable);
    } catch(error) {
      log.error('doLoadVariable error => ' + error);
      reject({error: error});
    }
  });
}

const reportCreator = function(elements, variable, pdfFileName){
	return new Promise(async function(resolve, reject) {
		const path = require('path');
		const publicDir = path.normalize(__dirname + '/../../../public');
		const fs = require("fs");
		const jsdom = require("jsdom");
		const { JSDOM } = jsdom;

		const qrgenerator = require('../../lib/qrcodegenerator.js');
		const qrcontent = 'https://202.28.68.28:4443/img/usr/qrcode/' + pdfFileName + '.pdf';
		const qrcode = await qrgenerator(qrcontent, pdfFileName);
		const qrlink = qrcode.qrlink;

		var html = '<!DOCTYPE html><head></head><body><div id="report-wrapper"></div></body>';
		var _window = new JSDOM(html, { runScripts: "dangerously", resources: "usable" }).window;
		/* ************************************************************************* */
		/* Add scripts to head ***************************************************** */
		var jsFiles = [
					publicDir + '/lib/jquery.js',
					publicDir + '/lib/jquery-ui.min.js',
					publicDir + '/report-design/jquery-report-plugin.js',
					publicDir + '/report-design/report-generator.js'
				];
		var scriptsContent = ``;
		for(var i =0; i< jsFiles.length;i++){
			let scriptContent = fs.readFileSync( jsFiles[i], 'utf8');
			scriptsContent = scriptsContent + `
			/* ******************************************************************************************* */
			/* `+jsFiles[i]+` **************************************************************************** */
			`+scriptContent;
		};
		let scriptElement = _window.document.createElement('script');
		scriptElement.textContent = scriptsContent;
		_window.document.head.appendChild(scriptElement);

		/* ************************************************************************* */
		/* Run page **************************************************************** */
		_window.document.addEventListener('DOMContentLoaded', () => {
			log.info('main says: DOMContentLoaded');
			// We need to delay one extra turn because we are the first DOMContentLoaded listener,
			// but we want to execute this code only after the second DOMContentLoaded listener
			// (added by external.js) fires.
			//_window.sayBye('OK Boy'); // prints "say-hello.js says: Good bye!"
			//_window.doSetReportParams(hospitalId, caseId, userId);
			//_window.doLoadReportFormat(hospitalId, (reportHTML) =>{
			log.info("Start Create Html Report.");
			_window.doMergeContent(elements, variable, qrlink, async (reportHTML) =>{

				/******/
				const usrPdfPath = publicDir + process.env.USRPDF_PATH;
				const htmlFileName = pdfFileName + '.html';
				const reportHtmlLinkPath = process.env.USRPDF_PATH + '/' + htmlFileName;

				var writerStream = fs.createWriteStream(usrPdfPath + '/' + htmlFileName);
				var reportContent = '<!DOCTYPE html><html><head><link href="/report-design/report.css" rel="stylesheet"></head><body><div id="report-wrapper">' + reportHTML + '</div></body></html>';
				writerStream.write(reportContent,'UTF8');
				writerStream.end();
				writerStream.on('finish', function() { log.info("Write Report HTML file completed."); });
				writerStream.on('error', function(err){ log.error(err.stack); });
				/******/

				log.info("Create Htlm Report Success.");
				setTimeout(async ()=>{
					log.info('==> ' + reportContent);
					log.info("Start Create Pdf Report.");

					const reportPdfFilePath = usrPdfPath + '/' + pdfFileName + '.pdf';
					const reportPdfLinkPath = process.env.USRPDF_PATH + '/' + pdfFileName + '.pdf';

					const creatReportCommand = parseStr('wkhtmltopdf -s A4 http://localhost:8080/%s %s', reportHtmlLinkPath, reportPdfFilePath);

					log.info('Create pdf report file with command => ' + creatReportCommand);
					runcommand(creatReportCommand).then((cmdout) => {
						log.info("Create Pdf Report file Success.");
						resolve({reportPdfLinkPath: reportPdfLinkPath, reportHtmlLinkPath: reportHtmlLinkPath});
					}).catch((cmderr) => {
						log.error('cmderr: 500 >>', cmderr);
						reject(cmderr);
					});
				}, 3000);
			});
		});
	});
}

const dicomConvertor = function(studyID, modality, fileCode, hospitalId) {
	return new Promise(async function(resolve, reject) {
		const orthancs = await db.orthancs.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
		//ip: "202.28.68.28", httpport: "8042", dicomport: "4242", user: "demo", pass: "demo", portex : "8042"};
		const cloud = JSON.parse(orthancs[0].Orthanc_Cloud)
		const ORTHANC_URL =  'http://' + cloud.ip + ':' + cloud.httpport;
		const USERPASS = cloud.user + ':' + cloud.pass;
		const publicDir = path.normalize(__dirname + '/../../../public');
		const USRPDF_PATH = process.env.USRPDF_PATH;
		const pdfFileName = fileCode + '.pdf';
		var outterCommand = 'curl --user ' + USERPASS + ' ' + ORTHANC_URL + '/studies/' + studyID;
		log.info('run command => ' + outterCommand);
		runcommand(outterCommand).then((stdout) => {
			log.info('result => ' + stdout);
			let studyObj = JSON.parse(stdout);
			let mainTags = Object.keys(studyObj.MainDicomTags);
			let patientMainTags = Object.keys(studyObj.PatientMainDicomTags);
			let bpmFile = fileCode + '.bmp';
			let dcmFile = fileCode + '.dcm';
			let command = '';
			command += 'convert -verbose -density 150 -trim ' + publicDir + USRPDF_PATH + '/' + pdfFileName + '[0]';
			command += ' -define bmp:format=BMP3 -quality 100 -flatten -sharpen 0x1.0 ';
			command += ' ' + publicDir + USRPDF_PATH + '/' + bpmFile;
			command += ' && cd ' + publicDir + USRPDF_PATH;
			command += ' && img2dcm -i BMP ' + bpmFile + ' ' + dcmFile;
			mainTags.forEach((tag, i) => {
				command += parseStr(' -k "%s=%s"', tag, Object.values(studyObj.MainDicomTags)[i]);
			});
			patientMainTags.forEach((tag, i) => {
				if (tag !== 'OtherPatientIDs')	{
					command += parseStr(' -k "%s=%s"', tag, Object.values(studyObj.PatientMainDicomTags)[i]);
				}
			});

			//command += ' -k "Modality=OT" -v';
			command += parseStr(' -k "Modality=%s" -v', modality);

			command += ' && storescu';
			command += parseStr(' %s %s', cloud.ip, cloud.dicomport);
			command +=  ' ' + dcmFile;
			command +=  ' -v';

			log.info('Start Convert Dicom with command => ' + command);
			runcommand(command).then((cmdout) => {
				log.info('result => ' + cmdout);
				removeTempFile(fileCode);
				resolve({dicomLink: USRPDF_PATH + '/' + dcmFile, dcmname: dcmFile});
			}).catch((cmderr) => {
				log.error('cmderr: 500 >>', cmderr);
				reject(cmderr);
			});
		}).catch((err) => {
			log.error('err: 500 >>', err);
			reject(err);
		});
	});
}

const removeTempFile = function(fileCode) {
	const publicDir = path.normalize(__dirname + '/../../../public');
	const USRPDF_PATH = process.env.USRPDF_PATH;
	const cron = require('node-cron');
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
    var command = parseStr('rm %s/%s.bmp', publicDir + USRPDF_PATH, fileCode);
    command += parseStr(' && rm %s/%s.html', publicDir + USRPDF_PATH, fileCode);
    command += parseStr(' && rm %s/%s.pdf', publicDir + USRPDF_PATH, fileCode);
    log.info('Remove tepmfiles with command => ' + command);
    runcommand(command).then((stdout) => {
      log.info('result => ' + stdout);
    }).catch((err) => {
      log.error('err: 500 >>', err);
    });
  });
}

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.body.caseId;
          const caserep = await Report.findAll({attributes: excludeColumn, where: {caseId: caseId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Records: caserep});
        } catch(error) {
          log.error(error);
          res.json({status: {code: 500}, error: error});
        }
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//insert API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
        try {
          const caseId = req.body.caseId;
          let newReport = req.body.data;
          let adReport = await Report.create(newReport);
          await Report.update({caseId: caseId}, { where: { id: adReport.id } });
          res.json({ status: {code: 200}, Record: adReport});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//updatee API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let upReport = req.body.data;
          await Report.update(upReport, { where: { id: req.body.id } });
          res.json({status: {code: 200}});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          await Report.destroy({ where: { id: req.body.id } });
          res.json({status: {code: 200}});
        } catch(error) {
      		log.error(error);
          res.json({ status: {code: 500}, error: error });
      	}
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Variable Service API
app.post('/variable', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then( (ur) => {
      if (ur.length > 0){
        const caseId = req.body.caseId;
        const userId = req.body.userId;
        doLoadVariable(caseId, userId).then((variable) =>{
          res.json({status: {code: 200}, variable: variable});
        })
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Create Report Service API
app.post('/create', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.body.caseId;
        const userId = req.body.userId;
        const hospitalId = req.body.hospitalId;
				const pdfFileName = req.body.pdfFileName;
				//const reportCode = genUniqueID();

				const reports = await db.hospitalreports.findAll({ attributes: ['Content'], where: {hospitalId: hospitalId}});
			  const reportElements = reports[0].Content;

				const reportVar = await doLoadVariable(caseId, userId);

				let report = await reportCreator(reportElements, reportVar, pdfFileName);
				res.json({status: {code: 200}, reportLink: report.reportPdfLinkPath, htmlLink: report.reportHtmlLinkPath});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

//Convert Report to dicom of ORTHANC Service API
app.post('/convert', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.body.caseId;
        const userId = req.body.userId;
        const hospitalId = req.body.hospitalId;
				const studyID = req.body.studyID;
				const modality = req.body.modality;
				const studyInstanceUID = req.body.studyInstanceUID;
				const pdfFileName = genUniqueID();

				const reports = await db.hospitalreports.findAll({ attributes: ['Content'], where: {hospitalId: hospitalId}});
			  const reportElements = reports[0].Content;

				const reportVar = await doLoadVariable(caseId, userId);

				let report = await reportCreator(reportElements, reportVar, pdfFileName);

				let dicom = await dicomConvertor(studyID, modality, pdfFileName, hospitalId);

				log.info('If you are => ' + ur[0].username + ', you will be recieve notity for trigger on local ORTHANC.')
				let cwss = websocket.socket.clients;
				cwss.forEach((wc) => {
					log.info('wc.id=> ' + wc.id);
					log.info('ur[0].username=> ' + ur[0].username);
					if (wc.id == ur[0].username) {
						let socketTrigger = {type: 'trigger', message: 'Please tell your orthanc update', studyid: studyID, dcmname: dicom.dcmname, studyInstanceUID: studyInstanceUID, owner: ur[0].username, hostname: req.hostname + ':4443'};
						wc.send(JSON.stringify(socketTrigger));
					}
				});

				res.json({status: {code: 200}, dicomLink: dicom.dicomLink});
      } else {
        log.info('Can not found user from token.');
        res.json({status: {code: 203}, error: 'Your token lost.'});
      }
    });
  } else {
    log.info('Authorization Wrong.');
    res.json({status: {code: 400}, error: 'Your authorization wrong'});
  }
});

module.exports = ( wssocket, dbconn, monitor ) => {
	websocket = wssocket;
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  Report = db.casereports;
  Case = db.cases;
  return app;
}
