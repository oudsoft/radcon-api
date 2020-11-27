const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, tasks, Case, log, auth, socket;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doSearchRadioForHospital = function(hospitalId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
      const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {usertypeId: 4}});
      let rades = [];
      radusers.forEach(async (user, i) => {
        let userHospitals = JSON.parse(user.userinfo.User_Hospitals);
        let tempHos = await userHospitals.find((item)=> {
          return item.id === hospitalId;
        });
        if (tempHos) {
          let tempRdl = {Value: user.id, DisplayText: user.userinfo.User_NameTH + ' ' + user.userinfo.User_LastNameTH};
          rades.push(tempRdl);
        }
      });
      setTimeout(()=> {
        resolve(rades);
      },400);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const doGenNewCaseOptions = function(hospitalId) {
  return new Promise(function(resolve, reject) {
    const promiseList = new Promise(async function(resolve, reject) {
      const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
      const clmes = await db.cliamerights.findAll({ attributes: ['id', 'CR_Name'] });
      const urges = await db.urgenttypes.findAll({ attributes: ['id', 'UGType_Name'], where: {hospitalId: hospitalId} });
      //const radusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {hospitalId: hospitalId, usertypeId: 4}});
      const refusers = await db.users.findAll({ attributes: excludeColumn, include: userInclude, where: {hospitalId: hospitalId, usertypeId: 5}});
      let cliames = [];
      clmes.forEach((clm, i) => {
        let tempRad = {Value: clm.id, DisplayText: clm.CR_Name};
        cliames.push(tempRad);
      });
      let urgents = [];
      urges.forEach((urg, i) => {
        let tempUrg = {Value: urg.id, DisplayText: urg.UGType_Name};
        urgents.push(tempUrg);
      });
      /*
      let rades = [];
      radusers.forEach((user, i) => {
        let tempRdl = {Value: user.id, DisplayText: user.userinfo.User_NameTH + ' ' + user.userinfo.User_LastNameTH};
        rades.push(tempRdl);
      });
      */
      let refes = [];
      refusers.forEach((user, i) => {
        let tempRef = {Value: user.id, DisplayText: user.userinfo.User_NameTH + ' ' + user.userinfo.User_LastNameTH};
        refes.push(tempRef);
      });
      let rades = await doSearchRadioForHospital(hospitalId);
      setTimeout(()=> {
        resolve({Result: "OK", Options: {cliames, urgents, rades, refes}});
      },400);
    });
    Promise.all([promiseList]).then((ob)=> {
      resolve(ob[0]);
    }).catch((err)=>{
      reject(err);
    });
  });
}

const doCallCaseStatusByName = function(Name) {
  return new Promise(async (resolve, reject) => {
    const casestatus = await db.casestatuses.findAll({ attributes: excludeColumn, where: {CS_Name_EN: Name} });
    resolve(casestatus);
  });
}

const doGetCaseDescription = function(caseId) {
  return new Promise(async (resolve, reject) => {
    const caseDesc = await db.cases.findAll({ attributes: ['id', 'Case_DESC'], where: {id: caseId} });
    resolve(caseDesc);
  });
}

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.query.hospitalId;
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          //const count = await Case.count();
          const cases = await Case.findAll({offset: startAt, limit: limit, attributes: excludeColumn, where: {hospitalId: hospitalId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({Result: "OK", Records: casees, TotalRecordCount: cases.length});
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

//Filter By Hospital API
app.post('/filter/hospital', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        //log.info('ur[0]=> ' + JSON.stringify(ur[0]));
        try {
          const hospitalId = req.body.hospitalId;
          const userId = req.body.userId;
          const statusId = req.body.statusId;
          const filterDate = req.body.filterDate;
          let whereClous;
          if (filterDate) {
            let startDate = new Date(filterDate.from);
            log.info(startDate);
            if (ur[0].usertypeId !== 5) {
              whereClous = {hospitalId: hospitalId, userId: userId, casestatusId: { [db.Op.in]: statusId }, createdAt: { [db.Op.gte]: startDate}};
            } else {
              whereClous = {hospitalId: hospitalId, Case_RefferalId: userId, casestatusId: { [db.Op.in]: statusId }, createdAt: { [db.Op.gte]: startDate}};
            }
          } else {
            if (ur[0].usertypeId !== 5) {
              whereClous = {hospitalId: hospitalId, userId: userId, casestatusId: { [db.Op.in]: statusId }};
            } else {
              whereClous = {hospitalId: hospitalId, Case_RefferalId: userId, casestatusId: { [db.Op.in]: statusId }};
            }
          }
          const caseInclude = [{model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
          const cases = await Case.findAll({include: caseInclude, where: whereClous});
          const casesFormat = [];
          const promiseList = new Promise(async function(resolve, reject) {
            cases.forEach(async (item, i) => {
              const radUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RadiologistId}});
              const rades = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: radUser[0].userinfoId}});
              const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
              const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
              casesFormat.push({case: item, Radiologist: rades[0], Refferal: refes[0]});
            });
            setTimeout(()=> {
              resolve(casesFormat);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
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


//Filter By radio API
app.post('/filter/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const statusId = req.body.statusId;
          const filterDate = req.body.filterDate;
          const raduserId = req.body.userId;
          const userInclude = [{model: db.userinfoes, attributes: ['id', 'User_NameEN', 'User_LastNameEN', 'User_NameTH', 'User_LastNameTH', 'User_Hospitals']}];
          const radusers = await db.users.findAll({include: userInclude, attributes: ['id', 'username'], where: {	id: raduserId}});
          const hospitals = JSON.parse(radusers[0].userinfo.User_Hospitals);
          const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
          const casesFormat = [];
          const promiseList = new Promise(function(resolve, reject) {
            hospitals.forEach(async (item, i) => {
              let whereClous;
              if (filterDate) {
                let startDate = new Date(filterDate.from);
                whereClous = {hospitalId: item.id, userId: raduserId, casestatusId: { [db.Op.in]: statusId }, createdAt: { [db.Op.gte]: startDate}};
              } else {
                whereClous = {hospitalId: item.id, Case_RadiologistId: raduserId, casestatusId: { [db.Op.in]: statusId }}
              }
              const cases = await Case.findAll({include: caseInclude, where: whereClous});
              cases.forEach((cas, i) => {
                casesFormat.push(cas)
              });

            });
            setTimeout(()=> {
              resolve(casesFormat);
            },1500);
          });
          Promise.all([promiseList]).then((ob)=> {
            const finalCases = [];
            const allCases = ob[0];
            const promiseListRef = new Promise(function(resolve, reject) {
              allCases.forEach(async (item, i) => {
                const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                finalCases.push({case: item, reff: refes[0]});
              });
              setTimeout(()=> {
                resolve(finalCases);
              },500);
            });
            Promise.all([promiseListRef]).then((obb)=> {
              log.info('obb[0]=>' + JSON.stringify(obb[0]));
              res.json({status: {code: 200}, Records: obb[0]});
            }).catch((err)=>{
              log.error('Error=>' + JSON.stringify(err));
              reject(err);
            });
          }).catch((err)=>{
            log.error('Error=>' + JSON.stringify(err));
            res.json({status: {code: 500}, error: err});
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

//Select API
app.post('/select/(:caseId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const caseId = req.params.caseId;
          const caseInclude = [{model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType_Name']}];
          const cases = await Case.findAll({include: caseInclude, where: {id: caseId}});
          const casesFormat = [];
          const promiseList = new Promise(async function(resolve, reject) {
            cases.forEach(async (item, i) => {
              const radUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RadiologistId}});
              const rades = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: radUser[0].userinfoId}});
              const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
              const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
              casesFormat.push({case: item, Radiologist: rades[0], Refferal: refes[0]});
            });
            setTimeout(()=> {
              resolve(casesFormat);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
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

//update status
app.post('/status/(:caseId)', async (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const caseId = req.params.caseId;
        const reqCaseStatusId = req.body.casestatusId;
        let caseStatusChange = { casestatusId: reqCaseStatusId, Case_DESC: req.body.caseDescription};
        let newCaseStatusId = Number(reqCaseStatusId);
        //log.info('Body of Request=> ' + JSON.stringify(req.body));
        let targetCases = await Case.findAll({ attributes: ['id', 'casestatusId', 'urgenttypeId', 'Case_RadiologistId'], where: {id: caseId}});
        let currentStatus = targetCases[0].casestatusId;
        switch (currentStatus) {
          case 1: //New -> 2, 3, 4, 7
            if (newCaseStatusId == 2) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              let refreshAcceptCase = {type: 'refresh', section: 'ReadWaitDiv', statusId: newCaseStatusId, caseId: caseId};
              socket.sendMessage(refreshAcceptCase, ur[0].username);
              let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_WorkingStep'], where: {id: targetCases[0].urgenttypeId}});
              let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);
              let radioUsers = await db.users.findAll({attributes: ['username'], where: {id: targetCases[0].Case_RadiologistId}});
              let radioUsername = radioUsers[0].username;
              tasks.doCreateNewTask(caseId, ur[0].username, triggerParam, radioUsername, ur[0].hospitalId, async (caseId, socket)=>{
                let nowcaseStatus = await Case.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
                if (nowcaseStatus[0].casestatusId === newCaseStatusId) {
                  doCallCaseStatusByName('Expired').then(async (expiredStatus) => {
                    await targetCases[0].setCasestatus(expiredStatus[0]);
                    tasks.removeTaskByCaseId(caseId);
                    log.info('caseId ' + caseId + ' was expired by schedule.');
                    let hoses = await db.hospitals.findAll({attributes: ['Hos_Name'], where: {id: req.body.hospitalId}});
                    let msg = 'Your a new Case on ' + hoses[0].Hos_Name + '. was expired by schedule';
                    let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
                    let canSend = socket.sendMessage(notify, radioUsername);
                    msg = 'Your a new Case was expired by schedule';
                    notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
                    socket.sendMessage(notify, ur[0].username);
                  });
                }
              });
            } else if ([3, 4, 7].indexOf(newCaseStatusId) >= 0) {
              log.info('test');
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 2: //Accepted -> 4, 5, 7
            if ([4, 5, 7].indexOf(newCaseStatusId) >= 0){
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
              if (newCaseStatusId == 5) {
                let refreshSuccessCase = {type: 'refresh', section: 'ReadSuccessDiv', statusId: newCaseStatusId, caseId: caseId};
                socket.sendMessage(refreshSuccessCase, ur[0].username);
              }
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 3: //Not Accept -> 1, 7
          case 4: //Expired -> 1, 7
            if (newCaseStatusId == 1) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep'], where: {id: targetCases[0].urgenttypeId}});
              let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
              let radioUsers = await db.users.findAll({attributes: ['username'], where: {id: targetCases[0].Case_RadiologistId}});
              let radioUsername = radioUsers[0].username;
              tasks.doCreateNewTask(caseId, ur[0].username, triggerParam, radioUsername, ur[0].hospitalId, async (caseId, socket)=>{
                let nowcaseStatus = await Case.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
                if (nowcaseStatus[0].casestatusId === newCaseStatusId) {
                  doCallCaseStatusByName('Expired').then(async (expiredStatus) => {
                    await targetCases[0].setCasestatus(expiredStatus[0]);
                    tasks.removeTaskByCaseId(caseId);
                    log.info('caseId ' + caseId + ' was expired by schedule.');
                    let hoses = await db.hospitals.findAll({attributes: ['Hos_Name'], where: {id: req.body.hospitalId}});
                    let msg = 'Your a new Case on ' + hoses[0].Hos_Name + '. was expired by schedule';
                    let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
                    let canSend = socket.sendMessage(notify, radioUsername);
                    msg = 'Your a new Case was expired by schedule';
                    notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
                    socket.sendMessage(notify, ur[0].username);
                  });
                }
              });
            } else if (newCaseStatusId == 7) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 5: //Success -> 6
            if (newCaseStatusId == 6) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 6: //Closed
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 7: //Cancel -> 1
            if (newCaseStatusId == 1) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep'], where: {id: targetCases[0].urgenttypeId}});
              let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
              let radioUsers = await db.users.findAll({attributes: ['username'], where: {id: targetCases[0].Case_RadiologistId}});
              let radioUsername = radioUsers[0].username;
              tasks.doCreateNewTask(caseId, ur[0].username, triggerParam, radioUsername, ur[0].hospitalId, async (caseId, socket)=>{
                let nowcaseStatus = await Case.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
                if (nowcaseStatus[0].casestatusId === newCaseStatusId) {
                  doCallCaseStatusByName('Expired').then(async (expiredStatus) => {
                    await targetCases[0].setCasestatus(expiredStatus[0]);
                    tasks.removeTaskByCaseId(caseId);
                    log.info('caseId ' + caseId + ' was expired by schedule.');
                    let hoses = await db.hospitals.findAll({attributes: ['Hos_Name'], where: {id: req.body.hospitalId}});
                    let msg = 'Your a new Case on ' + hoses[0].Hos_Name + '. was expired by schedule';
                    let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
                    let canSend = socket.sendMessage(notify, radioUsername);
                    msg = 'Your a new Case was expired by schedule';
                    notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
                    socket.sendMessage(notify, ur[0].username);
                  });
                }
              });
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
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

//Search By radio API
app.post('/search/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const raduserId = req.body.userId;
          const statusId = req.body.condition.statusId;
          const hospitalId = req.body.condition.hospitalId;
          const key = req.body.condition.key;
          const value = req.body.condition.value;
          const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}, {model: db.patients, attributes: excludeColumn}, {model: db.casestatuses, attributes: ['id', 'CS_Name_EN']}, {model: db.urgenttypes, attributes: ['id', 'UGType_Name']}, {model: db.cliamerights, attributes: ['id', 'CR_Name']}];
          const whereClous = {hospitalId: hospitalId, Case_RadiologistId: raduserId, casestatusId: { [db.Op.in]: statusId }};
          const cases = await Case.findAll({include: caseInclude, where: whereClous});
          let caseResults = [];
          const promiseList = new Promise(async function(resolve, reject) {
            cases.forEach(async (item, i) => {
              if (key === 'PatientName') {
                if (value.indexOf('*') == 0) {
                  let searchVal = value.substring(1);
                  if (item.patient.Patient_NameEN.indexOf(searchVal) >= 0) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0]});
                  }
                } else if (value.indexOf('*') == (value.length-1)) {
                  let searchVal = value.substring(0, (value.length-1));
                  if (item.patient.Patient_NameEN.indexOf(searchVal) >= 0) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0]});
                  }
                } else {
                  if (item.patient.Patient_NameEN === value) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0]});
                  }
                }
              } else if (key === 'PatientHN') {
                if (item.patient.Patient_HN === value) {
                  const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                  const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                  caseResults.push({case: item, reff: refes[0]});
                }
              }
            });
            setTimeout(()=> {
              resolve(caseResults);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
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

app.post('/hospital/radio', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.body.hospitalId;
          let rades = await doSearchRadioForHospital(hospitalId);
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

//add insert API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
        doCallCaseStatusByName('New').then(async (newcaseStatus) => {
          let newCase = req.body.data;
          let adCase = await Case.create(newCase);
          let setupCaseTo = { hospitalId: req.body.hospitalId, patientId: req.body.patientId, userId: req.body.userId, cliamerightId: req.body.cliamerightId, urgenttypeId: req.body.urgenttypeId};
          await Case.update(setupCaseTo, { where: { id: adCase.id } });
          await adCase.setCasestatus(newcaseStatus[0]);
          let refreshNewCase = {type: 'refresh', section: 'ReadWaitDiv', statusId: expiredStatus[0].id, caseId: adCase.id};
          socket.sendMessage(refreshNewCase, ur[0].username);
          let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep'], where: {id: req.body.urgenttypeId}});
          let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);
          let radioUsers = await db.users.findAll({attributes: ['username'], where: {id: req.body.data.Case_RadiologistId}});
          let radioUsername = radioUsers[0].username;
          tasks.doCreateNewTask(adCase.id, ur[0].username, triggerParam, radioUsername, req.body.hospitalId, async (caseId, socket)=>{
            let nowcaseStatus = await Case.findAll({ attributes: ['casestatusId'], where: {id: adCase.id}});
            if (nowcaseStatus[0].casestatusId === newcaseStatus[0].id) {
              doCallCaseStatusByName('Expired').then(async (expiredStatus) => {
                await adCase.setCasestatus(expiredStatus[0]);
                tasks.removeTaskByCaseId(caseId);
                log.info('caseId ' + caseId + ' was expired by schedule.');
                let hoses = await db.hospitals.findAll({attributes: ['Hos_Name'], where: {id: req.body.hospitalId}});
                let msg = 'Your a new Case on ' + hoses[0].Hos_Name + '. was expired by schedule';
                let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: adCase.id};
                let canSend = socket.sendMessage(notify, radioUsername);
                msg = 'Your a new Case was expired by schedule';
                notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: adCase.id};
                socket.sendMessage(notify, ur[0].username);
              });
            } else {
              log.info('caseId ' + caseId + ' was released by schedule.');
              tasks.removeTaskByCaseId(caseId);
            }
          });
          res.json({Result: "OK", status: {code: 200}, Record: adCase});
        });
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

//update API
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
        let updateCase = req.body.data;
        await Case.update(updateCase, { where: { id: req.body.id } });
        let setupCaseTo = { cliamerightId: req.body.cliamerightId, urgenttypeId: req.body.urgenttypeId};
        await Case.update(setupCaseTo, { where: { id: req.body.id } });
        res.json({Result: "OK", status: {code: 200}});
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

//delete API
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        /* casestatusId = 1, 7 จึงจะลบได้ */
        /* เมือ่ลบแล้วให้ค้นหา task และลบ task ด้วย */
        await Case.destroy({ where: { id: req.body.id } });
        res.json({Result: "OK", status: {code: 200}});
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
  doGenNewCaseOptions(hospitalId).then((result) => {
    res.json(result);
  })
});

app.get('/description/(:caseId)', (req, res) => {
  const caseId = req.params.caseId;
  doGetCaseDescription(caseId).then((result) => {
    res.json(result);
  });
});

module.exports = ( dbconn, caseTask, monitor, websocket ) => {
  db = dbconn;
  tasks = caseTask;
  log = monitor;
  auth = require('./auth.js')(db, log);
  socket = websocket;
  Case = db.cases;
  return app;
}
