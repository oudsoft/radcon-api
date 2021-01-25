const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Template, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doGenOptions = function(raduserId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const template = await Template.findAll({ attributes: ['id', 'Name'], where: {userId: raduserId} });
      const result = [];
      template.forEach((item, i) => {
        result.push({Value: item.id, DisplayText: item.Name});
      });
      setTimeout(()=> {
        resolve({ status: {code: 200}, Options: result});
      },200);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
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
          const raduserId = req.body.userId;
          const template = await Template.findAll({attributes: excludeColumn, where: {userId: raduserId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Records: template});
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

//Select API
app.post('/select/(:templateId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const templateId = req.params.templateId;
          const template = await Template.findAll({attributes: ['id', 'Name', 'Content'], where: {id: templateId}, order: [['id', 'ASC']]});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Record: template});
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

//add api
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const raduserId = req.body.userId;
        let newTemplate = req.body.data;
        let adTemplate = await Template.create(newTemplate);
        await Template.update({userId: raduserId}, { where: { id: adTemplate.id } });
        res.json({ status: {code: 200}, Record: adTemplate});
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
        let upTemplate = req.body.data;
        await Template.update(upTemplate, { where: { id: req.body.id } });
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
        await Template.destroy({ where: { id: req.body.id } });
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

app.get('/options/(:raduserId)', (req, res) => {
  const raduserId = req.params.raduserId;
  doGenOptions(raduserId).then((result) => {
    res.json(result);
  })
});

app.post('/options/(:raduserId)', (req, res) => {
  const raduserId = req.params.raduserId;
  doGenOptions(raduserId).then((result) => {
    res.json(result);
  })
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  Template = db.templates;
  return app;
}
