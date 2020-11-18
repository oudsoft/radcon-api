const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Urgenttype, log, auth;

const excludeColumn = { exclude: [ 'updatedAt', 'createdAt'] };

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.query.hospitalId;
          log.info('hospitalId=>' + hospitalId)
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          const count = await Urgenttype.count();
          const result = await Urgenttype.findAll({offset: startAt, limit: limit, attributes: excludeColumn, where: {hospitalId: hospitalId}});
          res.json({Result: "OK", Records: result, TotalRecordCount: count});
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
        //const userInclude = [{model: db.usertypes, attributes: excludeColumn}, {model: db.userstatuses, attributes: excludeColumn}, {model: db.userinfoes, attributes: excludeColumn}];
      	const subAction = req.params.subAction;
        log.info('Start Action => ' + subAction);
        log.info('Body of Request=> ' + JSON.stringify(req.body));
        log.info('Query of Request=> ' + JSON.stringify(req.query));
        const id = req.body.id;
        try {
          switch (subAction) {
            case 'add':
              let newUrgenttype = req.body;
              let adUrgenttype = await Urgenttype.create(newUrgenttype);
              res.json({Result: "OK", Record: adUrgenttype});
            break;
            case 'update':
              let updateUrgenttype = req.body;
              await Urgenttype.update(updateUrgenttype, { where: { id: id } });
              res.json({Result: "OK"});
            break;
            case 'delete':
              await Urgenttype.destroy({ where: { id: id } });
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

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  Urgenttype = db.urgenttypes;
  return app;
}
