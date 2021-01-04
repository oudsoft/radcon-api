const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json({ limit: "50MB", type:'application/json', extended: true}));
app.use(bodyParser.urlencoded({limit: '50MB', type:'application/x-www-form-urlencoded', extended: true}));

var db, DicomTransferLog, log, websocket, auth, uti;

const excludeColumn = { exclude: ['updatedAt'] };

const doLoadOrthancStudies = function(orthancId, hostname, studyId) {
	return new Promise(function(resolve, reject) {
    const method = 'get';
    uti.doMyLoadOrthanc(orthancId, hostname).then((orthanc) => {
			log.info('myorthanc=>' + JSON.stringify(orthanc));
      let cloud = JSON.parse(orthanc.Orthanc_Cloud);
      //let cloud = orthanc;
			let orthancUrl = 'http://' + cloud.ip + ':' + cloud.httpport;

      let rqParams = {
        method: method,
        auth:  {user: cloud.user, pass: cloud.pass},
        uri: orthancUrl + '/studies/' + studyId,
        body: {}
      };

      uti.proxyRequest(rqParams).then(async (proxyRes)=>{
        log.info('study=>' + JSON.stringify(proxyRes.res.body));
        let study = JSON.parse(proxyRes.res.body);

        const promiseList = new Promise(async function(resolve2, reject2) {
          let samplingSrs;
          for (let i=0; i < study.Series.length; i++) {
            let srsId = study.Series[i];
            rqParams.uri = orthancUrl + '/series/' + srsId;
            let proxySeriesRes = await uti.proxyRequest(rqParams);
            log.info('proxySeriesRes=>' + JSON.stringify(proxySeriesRes));
            let proxySeries = JSON.parse(proxySeriesRes.res.body);
            if ((proxySeries.MainDicomTags.SeriesDate) || (proxySeries.MainDicomTags.SeriesDescription)) {
              samplingSrs = proxySeries;
              break;
            }
          }
          setTimeout(()=> {
            resolve2(samplingSrs);
          },500);
        });
        Promise.all([promiseList]).then(async(ob)=> {
          let samplingSrs = ob[0];
          log.info('samplingSrs=>' + JSON.stringify(samplingSrs));
          if (samplingSrs) {
            study.SamplingSeries = samplingSrs;
          } else {
            rqParams.uri = orthancUrl + '/series/' + study.Series[0];
            let firstSeriesRes = await uti.proxyRequest(rqParams);
            let firstSeries = JSON.parse(firstSeriesRes.res.body);
            study.SamplingSeries = firstSeries;
          }
          resolve(study);
        }).catch((err)=>{
          reject(err);
        });



      });
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
          const orthancId = req.query.orthancId;
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          const count = await DicomTransferLog.count();
          const types = await DicomTransferLog.findAll({offset: startAt, limit: limit, attributes: excludeColumn, where: {orthancId: orthancId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({Result: "OK", Records: types, TotalRecordCount: count});
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

app.post('/add', async (req, res) => {
  log.info('req.body=> ' + JSON.stringify(req.body));
  let hostname = req.hostname;
  let hospitalId = req.body.hospitalId;
  let resourceType = req.body.resourceType;
  let resourceId = req.body.resourceId;
  const orthancs = await db.orthancs.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
  let yourOrthancId = orthancs[0].id;
  let studyTags = {};
  if (resourceType === 'study') {
    studyTags = await doLoadOrthancStudies(yourOrthancId, hostname, resourceId);
  }
  let newDicomTransferLog = {DicomTags: JSON.stringify(req.body.dicom), StudyTags: studyTags, ResourceID: resourceId, ResourceType: resourceType, orthancId: yourOrthancId};
  let adDicomTransferLog = await DicomTransferLog.create(newDicomTransferLog);
  log.info('New dicom ' + resourceType + ' Type transfer => ' + JSON.stringify(adDicomTransferLog));
  let cwss = websocket.socket.clients;
  if (resourceType === 'patient'){
    cwss.forEach((wc) => {
      if (wc.hospitalId == hospitalId) {
        let socketTrigger = {type: 'refresh', section: 'PACSDiv'};
        wc.send(JSON.stringify(socketTrigger));
      }
    });
  }
  res.json({Result: "OK", Record: adDicomTransferLog});
});
/*
  StudyID => ResourceID
  resourceType => {patient/study}
*/
app.post('/update', async (req, res) => {
  let updateDicomTransferLog = req.body;
  await DicomTransferLog.update(updateDicomTransferLog, { where: { id: id } });
  res.json({Result: "OK"});
});

app.post('/delete', async (req, res) => {
  await DicomTransferLog.destroy({ where: { id: id } });
  res.json({Result: "OK"});
});

// /api/dicomtransferlog/3/21776058-56a21078-f5e147ef-03854de7-88c7f837
// http://202.28.68.28:8042/studies/929a9934-78066d77-49181fbd-05cad6c2-18e9114e
app.get('/test/(:orthancId)/(:studyId)', async (req, res) => {
  let orthancId = req.params.orthancId;
  let studyId = req.params.studyId;
  let hostname = req.hostname;
  let fullStudy = await doLoadOrthancStudies(orthancId, hostname, studyId);
  res.json({Result: "OK", Record: fullStudy});
});

module.exports = ( wsssocket, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  websocket = wsssocket;
  auth = require('./auth.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  DicomTransferLog = db.dicomtransferlogs;
  return app;
}
