const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(bodyParser.json({ limit: "50MB", type:'application/json', extended: true}));
app.use(bodyParser.urlencoded({limit: '50MB', type:'application/x-www-form-urlencoded', extended: true}));

var db, DicomTransferLog, log, websocket, auth;

const excludeColumn = { exclude: ['updatedAt'] };

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
  let hospitalId = req.body.hospitalId;
  let resourceType = req.body.resourceType;
  const orthancs = await db.orthancs.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
  yourOrthancId = orthancs[0].id;
  let newDicomTransferLog = {DicomTags: JSON.stringify(req.body.dicom), ResourceID: req.body.resourceId, ResourceType: resourceType, orthancId: yourOrthancId};
  let adDicomTransferLog = await DicomTransferLog.create(newDicomTransferLog);
  log.info('New dicom ' + resourceType + ' Type transfer => ' + JSON.stringify(adDicomTransferLog));
  let cwss = websocket.socket.clients;
  if (resourceType === 'patient'){
    cwss.forEach((wc) => {
      if (wc.hospitalId == hospitalId) {
        let socketTrigger = {type: 'notify', message: 'You have a new patient dicom transfer on Server.', action: 'refresh'};
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

module.exports = ( wsssocket, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  websocket = wsssocket;
  auth = require('./auth.js')(db, log);
  DicomTransferLog = db.dicomtransferlogs;
  return app;
}
