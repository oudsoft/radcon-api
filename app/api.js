//require('dotenv').config();
const os = require('os');
const fs = require('fs');
const path = require("path");
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const apiApp = express();

var log;

apiApp.use(express.json({limit: '50mb'}));
apiApp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
//apiApp.use(bodyParser.json({ limit: "50MB", type:'application/json'}));
//apiApp.use(express.urlencoded({limit: '50mb'}));

const windowsappPath = '/home/windowsapp';
const db = require('./db/relation.js');
db.sequelize.sync({ force: false });

const windowsappStatic = express.static(windowsappPath);
const windowsappIndex = serveIndex(windowsappPath, {'icons': true});
const uploader = require('./lib/uploader.js')(apiApp);
const notificator = require('./lib/notification.js')(apiApp);

apiApp.use('/windowsapp', windowsappStatic, windowsappIndex);

//const orthancproxy = require('./lib/orthancproxy.js');
//apiApp.use('/orthancproxy', orthancproxy);

apiApp.get('/', (req, res) => {
	const hostname = req.headers.host;
	const rootname = req.originalUrl.split('/')[1];
	log.info('hostname => ' + hostname);
	log.info('rootname => ' + rootname);
	let url = '/' + rootname + '/index.html';
	res.redirect(url);
});

apiApp.post('/', (req, res) => {
	log.info(req.connection._peername);
	res.status(200).send(req.body);
});

require('./lib/v2/pdfconvertor.js')(apiApp);

module.exports = ( webSocketServer, monitor ) => {
	log = monitor;

	const externalapiproxy = require('./lib/v2/apiproxy.js')(db, log);
	const orthancproxy = require('./lib/orthancproxy_new.js')(db, log);
	const uploader = require('./lib/uploader.js')(apiApp);
	const pdfconvertor = require('./lib/pdfconvertor.js')(apiApp, webSocketServer);
	//const pdfconvertorV2 = require('./lib/v2/pdfconvertor.js')(apiApp);
	const taskCase = require('./lib/casetask.js')(webSocketServer, db, log);
	const taskApp = require('./lib/taskapp.js')(taskCase, db, log);
	const zoomApp = require('./lib/zoom.js')(db, log);
	const botApp = require('./lib/botapp.js')(taskCase, db, log);

	const users = require('./db/rest/users.js')(db, log);
	const user = require('./db/rest/user.js')(db, log);
	const usertypes = require('./db/rest/usertypes.js')(db, log);
	const userstatuses = require('./db/rest/userstatuses.js')(db, log);
	const hospital = require('./db/rest/hospital.js')(db, log);
	const urgenttypes = require('./db/rest/urgenttypes.js')(db, log);
	const generalstatus = require('./db/rest/generalstatus.js')(db, log);
	const cliamerights = require('./db/rest/cliamerights.js')(db, log);
	const orthanc = require('./db/rest/orthanc.js')(db, log);
	const dicomtransferlog = require('./db/rest/dicomtransferlog.js')(webSocketServer, db, log);
	const patient = require('./db/rest/patient.js')(db, log);
	const casestatus = require('./db/rest/casestatus.js')(db, log);
	const cases = require('./db/rest/cases.js')(db, taskCase, log, webSocketServer);
	const hospitalreport = require('./db/rest/hospitalreport.js')(db, log);
	const radiologist = require('./db/rest/radiologist.js')(db, log);
	const workinghour = require('./db/rest/workinghour.js')(db, log);
	const workingschedule = require('./db/rest/workingschedule.js')(db, log);
	const template = require('./db/rest/template.js')(db, log);
	const caseresponse = require('./db/rest/caseresponse.js')(db, log);
	const casereport = require('./db/rest/casereport.js')(webSocketServer, db, log);
	const risinterface = require('./db/rest/risinterface.js')(db, log);
	const scanpartref = require('./db/rest/scanpartref.js')(db, log);
	const scanpartaux = require('./db/rest/scanpartaux.js')(db, log);

	apiApp.use('/external', externalapiproxy);
	apiApp.use('/orthancproxy', orthancproxy);
	apiApp.use('/users', users);
	apiApp.use('/user', user);
	apiApp.use('/usertypes', usertypes);
	apiApp.use('/userstatuses', userstatuses);
	apiApp.use('/hospital', hospital);
	apiApp.use('/cliamerights', cliamerights);
	apiApp.use('/urgenttypes', urgenttypes);
	apiApp.use('/generalstatus', generalstatus);
	apiApp.use('/cliamerights', cliamerights);
	apiApp.use('/orthanc', orthanc);
	apiApp.use('/dicomtransferlog', dicomtransferlog);
	apiApp.use('/patient', patient);
	apiApp.use('/casestatus', casestatus);
	apiApp.use('/cases', cases);
	apiApp.use('/hospitalreport', hospitalreport);
	apiApp.use('/radiologist', radiologist);
	apiApp.use('/workinghour', workinghour);
	apiApp.use('/workingschedule', workingschedule);
	apiApp.use('/template', template);
	apiApp.use('/caseresponse', caseresponse);
	apiApp.use('/casereport', casereport);
	apiApp.use('/tasks', taskApp);
	apiApp.use('/zoom', zoomApp);
	apiApp.use('/bot', botApp);
	apiApp.use('/ris', risinterface);
	apiApp.use('/scanpartref', scanpartref);
	apiApp.use('/scanpartaux', scanpartaux);

	const publicDir = path.normalize(__dirname + '/..' + '/public');
	const internalHTTP = 'http-server ' + publicDir;
	log.info('Create Internal HTTP Server with command=>' + internalHTTP);
	uploader.runcommand(internalHTTP).then((result)=>{
		log.info('result=>' + result);
	}).catch((err) => {
		log.error('error=>' + err);
	});
	return { api: apiApp, db: db };
}
