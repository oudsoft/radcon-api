const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Userstatus, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          const count = await Userstatus.count();
          const types = await Userstatus.findAll({offset: startAt, limit: limit, attributes: excludeColumn});
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

//insert, update, delete API
app.post('/(:subAction)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
      	const subAction = req.params.subAction;
        log.info('Start Action => ' + subAction);
        log.info('Body of Request=> ' + JSON.stringify(req.body));
        log.info('Query of Request=> ' + JSON.stringify(req.query));
        const id = req.body.id;
        try {
          switch (subAction) {
            case 'add':
              let newUserstatus = req.body;
              let adUserstatus = await Userstatus.create(newUserstatus);
              res.json({Result: "OK", Record: adUserstatus});
            break;
            case 'update':
              let updateUserstatus = req.body;
              await Userstatus.update(updateUserstatus, { where: { id: id } });
              res.json({Result: "OK"});
            break;
            case 'delete':
              await Userstatus.destroy({ where: { id: id } });
              res.json({Result: "OK"});
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

app.get('/options', async (req, res) => {
  const statuses = await Userstatus.findAll({ attributes: ['id', 'UserStatus_Name'] });
  const result = [];
  statuses.forEach((status, i) => {
    result.push({Value: status.id, DisplayText: status.UserStatus_Name});
  });
  res.json({Result: "OK", Options: result});
});

app.post('/options', async (req, res) => {
  const statuses = await Userstatus.findAll({ attributes: ['id', 'UserStatus_Name_Name'] });
  const result = [];
  statuses.forEach((status, i) => {
    result.push({Value: status.id, DisplayText: type.UserStatus_Name});
  });
  res.json({Result: "OK", Options: result});
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  Userstatus = db.userstatuses;
  return app;
}
