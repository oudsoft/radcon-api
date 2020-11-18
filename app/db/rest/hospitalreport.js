const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Report, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

//List API
app.get('/select/(:hospitalId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.params.hospitalId;
          const reports = await Report.findAll({ attributes: excludeColumn, where: {hospitalId: hospitalId}});
          res.json({status: {code: 200}, Records: reports});
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

//insert, update, delete API
app.post('/(:subAction)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
      	const subAction = req.params.subAction;
        log.info('Hospital Report Start Action => ' + subAction);
        log.info('Hospital Report Body of Request=> ' + JSON.stringify(req.body));
        try {
          switch (subAction) {
            case 'add':
              let content = JSON.parse(req.body.Content);
              let adReport = await Report.create({Content: content});
              await Report.update({hospitalId: req.body.hospitalId}, { where: { id: adReport.id } });
              res.json({status: {code: 200}, Record: adReport});
            break;
            case 'update':
              let updateContent = JSON.parse(req.body.Content);
              await Report.update({Content: updateContent}, { where: { id: req.body.id } });
              res.json({status: {code: 200}});
            break;
            case 'delete':
              await Report.destroy({ where: { id: req.body.id } });
              res.json({status: {code: 200}});
            break;
          }
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

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  Report = db.hospitalreports;
  return app;
}
