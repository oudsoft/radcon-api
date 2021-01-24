const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Response, log, auth, uti, common, tasks, socket, statusControl;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.body.caseId;
          const caseres = await Response.findAll({attributes: excludeColumn, where: {caseId: caseId}});
          res.json({ status: {code: 200}, Records: caseres});
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

//select API
app.post('/select/(:caseId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.params.caseId;
          const caseres = await Response.findAll({attributes: excludeColumn, where: {caseId: caseId}});
          res.json({ status: {code: 200}, Record: caseres});
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

//insert api
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.body.caseId;
        const userId = req.body.userId;
        const cases = await db.cases.findAll({attributes: ['casestatusId'], where: {id: caseId}});
        const users = await db.users.findAll({attributes: ['id'], where: {id: userId}});
        const responseType = req.body.data.Response_Type;
        const nowStatusId = cases[0].casestatusId;
        let nextStatus = undefined;
        let remark = 'Radilo Save normal Response success.';
        if (responseType === 'normal'){
          nextStatus = 5;
        } else if (responseType === 'draft'){
          nextStatus = 9;
        }
        if (nowStatusId == 8) {
          let newResponse = req.body.data;
          let adResponse = await Response.create(newResponse);
          await Response.update({caseId: caseId, userId: userId}, { where: { id: adResponse.id } });
          await db.cases.update({casestatusId: nextStatus}, { where: { id: caseId } });
          /*
          if (responseType === 'normal'){
            let changeResult = await statusControl.doChangeCaseStatus(nowStatusId, nextStatus, caseId, userId, remark);
            let newCaseReport = {Remark: remark, Report_Type: req.body.reporttype};
            let adReport = await db.casereports.create(newCaseReport);
            await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: responseId}, { where: { id: adReport.id } });
          } else if (responseType === 'draft'){

          }
          */
          await statusControl.onDraftCaseEvent(caseId);

          res.json({ status: {code: 200}, result: {responseId: adResponse.id}});
        } else if (nowStatusId == 9 ) {
          let responseId = req.body.responseId;
          let updateResponse = req.body.data;
          let upResponse = await Response.update(updateResponse, { where: { id: responseId } });
          if (responseType === 'normal'){
            let changeResult = await statusControl.doChangeCaseStatus(cases[0].casestatusId, nextStatus, caseId, userId, remark);
            let newCaseReport = {Remark: remark, Report_Type: req.body.reporttype, PDF_Filename: req.body.PDF_Filename};
            let adReport = await db.casereports.create(newCaseReport);
            await db.casereports.update({caseId: caseId, userId: userId, caseresponseId: responseId}, { where: { id: adReport.id } });
            await statusControl.onSuccessCaseEvent(caseId);
            res.json({ status: {code: 200}, result: changeResult});
          } else if (responseType === 'draft'){
            res.json({ status: {code: 200}, result: {responseId: responseId}});
          }
        } else {
          res.json({ status: {code: 200}, text: 'Your case is not on recieve response status.'});
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

//update api
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let upResponse = req.body.data;
        await Response.update(upResponse, { where: { id: req.body.id } });
        res.json({status: {code: 200}});
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

//delete api
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        await Response.destroy({ where: { id: req.body.id } });
        res.json({status: {code: 200}});
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

module.exports = ( dbconn, caseTask, monitor, websocket ) => {
  db = dbconn;
  tasks = caseTask;
  log = monitor;
  socket = websocket;
  auth = require('./auth.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  common = require('./commonlib.js')(db, log, tasks);
  statusControl = require('./statuslib.js')(db, log, tasks, socket);
  Response = db.caseresponses;
  return app;
}
