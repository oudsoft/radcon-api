const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, log, auth, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          log.info('rqe.body=> ' + JSON.stringify(req.body));
          const hospitalId = req.body.hospitalId;
          const userInclude = [{model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH']}];
          const radio = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {hospitalId: hospitalId, usertypeId: 4}});
          res.json({status: {code: 200}, Records: radio});
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

app.post('/hospital/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.body.hospitalId;
          let rades = await common.doSearchRadioForHospital(hospitalId);
          res.json({status: {code: 200}, Records: rades});
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

//join options API
app.post('/join/(:radioId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let radioId = req.params.radioId;
          const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
          const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {id: radioId}});
          const joins = JSON.parse(radusers[0].userinfo.User_Hospitals);
          const options = [];
          const promiseList = new Promise(async function(resolve, reject) {
            joins.forEach(async (item, i) => {
              const hoss = await db.hospitals.findAll({ attributes: ['id', 'Hos_Name'], where: {id: item.id}});
              let option = {Value: hoss[0].id, DisplayText: hoss[0].Hos_Name};
              options.push(option);
            });
            setTimeout(()=> {
              resolve(options);
            },400);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, options: ob[0]});
          }).catch((err)=>{
            log.error(error);
            res.json({status: {code: 500}, error: error});
          });
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

//join update API
app.post('/join/update/(:radioId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let radioId = req.params.radioId;
          const radioUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: radioId}});
          let radioUserinfoId = radioUser[0].userinfoId;
          let joinDataUpdate = {User_Hospitals: JSON.stringify(req.body.data)};
          await db.userinfoes.update(joinDataUpdate, { where: { id: radioUserinfoId } });
          res.json({status: {code: 200}});
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

//caseaccept load update API
app.post('/caseaccept/(:radioId)/(:hospitalId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let radioId = req.params.radioId;
          let hospitalId = req.params.hospitalId;
          const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
          const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {id: radioId}});
          const radioConfigs = JSON.parse(radusers[0].userinfo.User_Hospitals);
          const promiseList = new Promise(async function(resolve, reject) {
            const configs = await radioConfigs.filter((item, i) => {
              if (item.id === hospitalId) {
                return item;
              }
            });
            setTimeout(()=> {
              resolve(configs);
            },400);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, configs: ob[0]});
          }).catch((err)=>{
            log.error(error);
            res.json({status: {code: 500}, error: error});
          });
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

//caseaccept reset update API
app.post('/caseaccept/reset/(:radioId)/(:hospitalId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let radioId = req.params.radioId;
          let hospitalId = req.params.hospitalId;
          const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
          const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {id: radioId}});
          const radioConfigs = JSON.parse(radusers[0].userinfo.User_Hospitals);
          const radioUserinfoId = radusers[0].userinfo.id;
          const promiseList = new Promise(async function(resolve, reject) {
            const anotherConfigs = await radioConfigs.filter((item, i) => {
              if (item.id !== hospitalId) {
                return item;
              }
            });
            anotherConfigs.push(req.body);
            setTimeout(()=> {
              resolve(anotherConfigs);
            },400);
          });
          Promise.all([promiseList]).then(async (ob)=> {
            let configData = {User_Hospitals: JSON.stringify(ob[0])};
            await db.userinfoes.update(configData, { where: { id: radioUserinfoId } });
            res.json({status: {code: 200}});
          }).catch((err)=>{
            log.error(error);
            res.json({status: {code: 500}, error: error});
          });
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

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('./auth.js')(db, log);
  common = require('./commonlib.js')(db, log);
  return app;
}
