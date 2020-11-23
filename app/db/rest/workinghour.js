const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, WorkingH, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doGenOptions = function(hospitalId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const workingh = await WorkingH.findAll({ attributes: ['id', 'WH_Name'], where: {hospitalId: hospitalId} });
      const result = [];
      workingh.forEach((item, i) => {
        result.push({Value: item.id, DisplayText: item.WH_Name});
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
          const hospitalId = req.body.hospitalId;
          const workingh = await WorkingH.findAll({attributes: excludeColumn, where: {hospitalId: hospitalId}, order: [['id', 'ASC']]});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({ status: {code: 200}, Records: workingh});
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
        try {
          let hospitalId = req.body.hospitalId;
          let newWorkingH = {WH_Name: req.body.data.WHName, WH: JSON.stringify(req.body.data.WH)};
          let adWorkingH = await WorkingH.create(newWorkingH);
          await WorkingH.update({hospitalId: hospitalId}, { where: { id: adWorkingH.id } });
          res.json({ status: {code: 200}, Record: adWorkingH});
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

//Update API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let updateWorkingH = {WH_Name: req.body.data.WHName, WH: JSON.stringify(req.body.data.WH)};
          await WorkingH.update(updateWorkingH, { where: { id: req.body.id } });
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

//Delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          await WorkingH.destroy({ where: { id: req.body.id } });
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

app.get('/options/(:hospitalId)', (req, res) => {
  const hospitalId = req.params.hospitalId;
  doGenOptions(hospitalId).then((result) => {
    res.json(result);
  })
});

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  WorkingH = db.workinghours;
  return app;
}
