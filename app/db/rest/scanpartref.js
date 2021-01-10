const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, ScanPartRef, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
/*
  RIS User
  Token = eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyaXN1c2VyIiwiaWF0IjoxNjA4ODc5NzIxMTg0fQ.HM3ADA9p7Mtv0nAR47hKYSHhogsZoImSG3OAPuKnGMI
*/
//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const count = await ScanPartRef.count();
          const scanPartRef = await ScanPartRef.findAll({ attributes: excludeColumn, order: [['id', 'ASC']]});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({Result: "OK", Records: scanPartRef, TotalRecordCount: count});
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

//Add API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let newScanPartRefData = {RisData: req.body};
        let adScanPartRef = await ScanPartRef.create(newScanPartRefData);
        res.json({status: {code: 200}, Record: adScanPartRef});
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

//Update API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        //const id = req.body.id;
        const id = 1;
        let updateScanPartRef = {ScanPartRefData: req.body};
        await ScanPartRef.update(updateScanPartRef, { where: { id: id } });
        res.json({Result: "OK"});
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

//Delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const id = req.body.id;
        await ScanPartRef.destroy({ where: { id: id } });
        res.json({Result: "OK"});
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
  ScanPartRef = db.scanpartrefs;
  return app;
}
