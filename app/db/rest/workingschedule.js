const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, WorkingS, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const formatDateStr = function(d) {
	var yy, mm, dd;
	yy = d.getFullYear();
	if (d.getMonth() + 1 < 10) {
		mm = '0' + (d.getMonth() + 1);
	} else {
		mm = '' + (d.getMonth() + 1);
	}
	if (d.getDate() < 10) {
		dd = '0' + d.getDate();
	} else {
		dd = '' + d.getDate();
	}
	var td = `${yy}-${mm}-${dd}`;
	return td;
}

const formatDate = function(dateStr) {
	var fdate = new Date(dateStr);
	var mm, dd;
	if (fdate.getMonth() + 1 < 10) {
		mm = '0' + (fdate.getMonth() + 1);
	} else {
		mm = '' + (fdate.getMonth() + 1);
	}
	if (fdate.getDate() < 10) {
		dd = '0' + fdate.getDate();
	} else {
		dd = '' + fdate.getDate();
	}
	var date = fdate.getFullYear() + (mm) + dd;
	return date;
}

const getDateLastWeek = function(){
	var days = 7;
	var d = new Date();
	var last = new Date(d.getTime() - (days * 24 * 60 * 60 * 1000));
	var td = formatDateStr(last);
	return formatDate(td);
}

//List API hospital view
app.post('/hospital/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.body.hospitalId;
          let startDate = new Date();
          let endDate = getDateLastWeek();
          const userInclude = [{model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH']}];
          const radusers = await db.users.findAll({include: userInclude, attributes: ['id', 'username'], where: {	usertpyeId: 4}});
          let schedules = [];
          const promiseList = new Promise(async function(resolve, reject) {
            radusers.forEach(async (item, i) => {
              const workings = await WorkingS.findAll({attributes: excludeColumn, where: {hospitalId: hospitalId, Date: { [db.Op.between]: [startDate, endDat]}, userId: item.users.id}, order: [['Date', 'ASC']]});
              let sch = {radio: item, schedule: workings};
              schedules.push(sch);
            });
            setTimeout(()=> {
              resolve(schedules);
            },400);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({ status: {code: 200}, Records: ob[0]});
          }).catch((err)=>{
            reject(err);
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

//List API radiologist view
app.post('/radio/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const userId = req.body.userId; //userId is radiologist
          let startDate = new Date();
          let endDate = getDateLastWeek();
          const userInclude = [{model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH', 'User_Hospitals']}];
          const radusers = await db.users.findAll({include: userInclude, attributes: ['id', 'username'], where: {	id: userId}});
          const hospitals = radusers.userinfo.User_Hospitals;
          let schedules = [];
          const promiseList = new Promise(async function(resolve, reject) {
            hospitals.forEach(async (item, i) => {
              const workings = await WorkingS.findAll({attributes: excludeColumn, where: {hospitalId: hospitalId, Date: { [db.Op.between]: [startDate, endDat]}, hospitalId: item.id}, order: [['Date', 'ASC']],});
              let sch = {radio: item, schedule: workings};
              schedules.push(sch);
            });
            setTimeout(()=> {
              resolve(schedules);
            },400);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({ status: {code: 200}, Records: ob[0]});
          }).catch((err)=>{
            reject(err);
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

//insert, update, delete API
app.post('/(:subAction)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
      	const subAction = req.params.subAction;
        //log.info('Start Action => ' + subAction);
        //log.info('Body of Request=> ' + JSON.stringify(req.body));
        //log.info('Query of Request=> ' + JSON.stringify(req.query));
        try {
          switch (subAction) {
            case 'add':
              const hospitalId = req.body.hospitalId;
              const userId = req.body.userId;
              let newWorkingS = req.body.data;
              let adWorkingS = await WorkingS.create(newWorkingS);
              await WorkingS.update({hospitalId: hospitalId, userId: userId}, { where: { id: adWorkingS.id } });
              res.json({ status: {code: 200}, Record: adWorkingS});
            break;
            case 'update':
              let upWorkingS = req.body.data;
              await WorkingS.update(WorkingS, { where: { id: req.body.id } });
              res.json({status: {code: 200}});
            break;
            case 'delete':
              await WorkingS.destroy({ where: { id: req.body.id } });
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
  WorkingS = db.workingschedules;
  return app;
}
