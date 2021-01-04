const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, tasks, Case, log, auth, socket, lineApi, uti, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

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
      let rades = await common.doSearchRadioForHospital(hospitalId);
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

const doLoadUserProfile = function(userId){
  return new Promise(async (resolve, reject) => {
    let userInclude = [{model: db.userinfoes, attributes: excludeColumn}, {model: db.hospitals, attributes: ['Hos_Name']}];
    let ownerCaseUsers = await db.users.findAll({attributes: excludeColumn, include: userInclude, where: {id: userId}});
    let ownerCaseUserLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {userId: userId}});
    let ownerCaseUserProfile = {userId: userId, username: ownerCaseUsers[0].username, User_NameEN: ownerCaseUsers[0].User_NameEN, User_LastNameEN: ownerCaseUsers[0].User_LastNameEN, hospitalId: ownerCaseUsers[0].hospitalId, hospitalName: ownerCaseUsers[0].hospital.Hos_Name};
    if ((ownerCaseUserLines) && (ownerCaseUserLines.length > 0)) {
      ownerCaseUserProfile.lineUserId = ownerCaseUserLines[0].UserId;
    }
    resolve(ownerCaseUserProfile);
  });
}

const doLoadRadioProfile = function(radioId, hospitalId){
  return new Promise(async (resolve, reject) => {
    let userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
    let radioUsers = await db.users.findAll({attributes: excludeColumn, include: userInclude, where: {id: radioId}});
    let radioUserLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {userId: radioId}});
    let radioConfigs = JSON.parse(radioUsers[0].userinfo.User_Hospitals);
    let configs = await radioConfigs.filter((item, i) => {
      if (item.id === hospitalId) {
        return item;
      }
    });
    let radioProfile = {userId: radioId, username: radioUsers[0].username, User_NameEN: radioUsers[0].User_NameEN, User_LastNameEN: radioUsers[0].User_LastNameEN, config: configs[0]};
    if ((radioUserLines) && (radioUserLines.length > 0)) {
      radioProfile.lineUserId = radioUserLines[0].UserId;
    }
    resolve(radioProfile);
  });
}

const doCaseExpireAction = function(caseId, socket, newcaseStatusId, radioProfile, userProfile, lineCaseDetaileMsg, hospitalName){
  return new Promise(async (resolve, reject) => {
    const expiredStatus = await doCallCaseStatusByName('Expired');
    const targetCases = await Case.findAll({ attributes: excludeColumn, where: {id: caseId}});
    const action = 'quick';

    // Update Case Status
    await targetCases[0].setCasestatus(expiredStatus[0]);
    tasks.removeTaskByCaseId(caseId);
    log.info('caseId ' + caseId + ' was expired by schedule.');

    // Notify Case Owner Feedback
    let msg = 'Your a new Case on ' + hospitalName + '. was expired by schedule';
    let notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
    await socket.sendMessage(notify, radioProfile.username);
    // Notify Case Radio
    msg = 'Your a new Case was expired by schedule';
    notify = {type: 'notify', message: msg, statusId: expiredStatus[0].id, caseId: caseId};
    await socket.sendMessage(notify, userProfile.username);
    // Notify for refresh Page on Case Owner [Option]
    let refreshNewCase = {type: 'refresh', section: 'ReadWaitDiv', statusId: expiredStatus[0].id, caseId: caseId};
    await socket.sendMessage(refreshNewCase, userProfile.username);

    // Chatbot message to Radio
    if ((radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      let lineCaseMsg = lineCaseDetaileMsg + 'หมดเวลาในช่วงรอตอบรับ หากคุณต้องการใช้บริการอื่นเชิญเลือกจากเมนูครับ';
      let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.mainMenu);
      await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
    }

    // Chatbot message to Owner Case
    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      let lineCaseMsg = lineCaseDetaileMsg + 'ได้หมดเวลาในช่วงรอการตอบรับจากรังสีแพทยแล้วครับ\nคุณสามารถใช้บริการอื่นจากเมนูครับ';
      let lineMsg = lineApi.createBotMenu(lineCaseMsg, action, lineApi.mainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
    }

    resolve(targetCases);
  });
}

const doCreatetaskAction = function(caseId, userProfile, radioProfile, triggerParam, baseCaseStatusId, lineCaseDetaileMsg){
  return new Promise(async function(resolve, reject) {
    const action = 'quick';
    let endTime = await tasks.doCreateNewTask(caseId, userProfile.username, triggerParam, radioProfile.username, userProfile.hospitalName, async (caseId, socket, endDateTime)=>{
      let nowcaseStatus = await Case.findAll({ attributes: ['casestatusId'], where: {id: caseId}});
      if (nowcaseStatus[0].casestatusId === baseCaseStatusId) {
        await doCaseExpireAction(caseId, socket, baseCaseStatusId, radioProfile, userProfile, lineCaseDetaileMsg, userProfile.hospitalName);
      } else {
        log.info('caseId ' + caseId + ' was released by schedule.');
        tasks.removeTaskByCaseId(caseId);
      }
    });
    // Chatbot message to Radio
    if ((radioProfile.lineUserId) && (radioProfile.lineUserId !== '')) {
      let endDate = new Date(endTime);
      let endYY = endDate.getFullYear();
      let endMM = endDate.getMonth() + 1;
      let endDD = endDate.getDate();
      let endHH = endDate.getHours();
      let endMN = endDate.getMinutes();
      let endDateText = uti.parseStr('วันที่ %s-%s-%s เวลา %s:%s น. ', endYY, endMM, endDD, endHH, endMN);
      if (baseCaseStatusId == 1 ) {
        let lineCaseMsg = lineCaseDetaileMsg + 'เคสนี้จะหมดอายุภายใน ' + endDateText + '\nคุณสมารถตอบรับหรือปฏิเสธเคสนี้ได้โดยเลือกจากเมนูด้านล่างครับ';
        let actionQuickReply = acceptActionMenu =  [{id: 'x401', name: 'รับ', data: adCase.id}, {id: 'x402', name: 'ไม่รับ', data: adCase.id}];
        let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, actionQuickReply);
        await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
      } else if (baseCaseStatusId == 2 ) {
        let lineCaseMsg = lineCaseDetaileMsg  + 'ระบบฯ ได้ทำการตอบรับเคสให้คุณโดยอัตโนมัติตามที่คุณตั้งค่าโปรไฟล์ไว้เรียบร้อยแล้ว\nเคสนี้จะหมดอายุภายใน ' + endDateText + '\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ';
        let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.mainMenu);
        await lineApi.pushConnect(radioProfile.lineUserId, menuQuickReply);
        if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
          lineCaseMsg = lineCaseDetaileMsg  + 'ได้ถูกตอบรับโดยรังสีแพทย์เรียบร้อยแล้ว\nเคสนี้จะหมดอายุสำหรับส่งผลอ่านภายใน ' + endDateText + '\nหากคุณต้องการใช้บริการอื่นๆ เชิญเลือกจากเมนูด้านล่างครับ';
          let menuQuickReply = lineApi.createBotMenu(lineCaseMsg, action, lineApi.mainMenu);
          await lineApi.pushConnect(userProfile.lineUserId, menuQuickReply);
        }
      }
    }
    resolve(endTime);
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
          res.json({Result: "OK", Records: cases, TotalRecordCount: cases.length});
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
          const orderby = [['id', 'DESC']];
          const cases = await Case.findAll({include: caseInclude, where: whereClous, order: orderby});
          const casesFormat = [];
          const promiseList = new Promise(async function(resolve, reject) {
            for (let i=0; i<cases.length; i++) {
              let item = cases[i];
              const radUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RadiologistId}});
              const rades = await db.userinfoes.findcdAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: radUser[0].userinfoId}});
              const Radiologist = {id: item.Case_RadiologistId, User_NameTH: rades[0].User_NameTH, User_LastNameTH: rades[0].User_LastNameTH};
              const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
              const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
              const Refferal = {id: item.Case_RefferalId, User_NameTH: refes[0].User_NameTH, User_LastNameTH: refes[0].User_LastNameTH};
              casesFormat.push({case: item, Radiologist: Radiologist, Refferal: Refferal});
            }
            setTimeout(()=> {
              resolve(casesFormat);
            },500);
          });
          Promise.all([promiseList]).then((ob)=> {
            res.json({status: {code: 200}, Records: ob[0]});
          }).catch((err)=>{
            log.error(error);
            res.json({status: {code: 500}, error: err});
          });
        } catch(error) {
          log.error('Error=>' + JSON.stringify(err));
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
          if (radusers[0].userinfo.User_Hospitals) {
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
                const orderby = [['id', 'DESC']];
                const cases = await Case.findAll({include: caseInclude, where: whereClous, order: orderby});
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
                  const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                  const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                  finalCases.push({case: item, reff: refes[0], owner: owners[0]});
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
                res.json({status: {code: 500}, error: error});
              });
            }).catch((err)=>{
              log.error('Error=>' + JSON.stringify(err));
              res.json({status: {code: 500}, error: err});
            });
          }
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
        const caseInclude = [{model: db.hospitals, attributes: ['Hos_Name']}];

        const caseStatusChange = { casestatusId: reqCaseStatusId, Case_DESC: req.body.caseDescription};
        const newCaseStatusId = Number(reqCaseStatusId);

        const targetCases = await Case.findAll({ attributes: excludeColumn, include: caseInclude, where: {id: caseId}});

        const currentStatus = targetCases[0].casestatusId;
        const caseHospitalId = targetCases[0].hospitalId;
        const caseHospitalName = targetCases[0].hospital.Hos_Name;
        const userId = targetCases[0].userId;
        const radioId = targetCases[0].Case_RadiologistId;
        const hospitalId = targetCases[0].hospitalId;
        const patientId = targetCases[0].patientId;
        const urgenttypeId = targetCases[0].urgenttypeId;

        switch (currentStatus) {
          case 1: //New -> 2, 3, 4, 7
            if (newCaseStatusId == 2) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              let refreshAcceptCase = {type: 'refresh', section: 'ReadWaitDiv', statusId: newCaseStatusId, caseId: caseId};
              await socket.sendMessage(refreshAcceptCase, ur[0].username);

              //Load Radio radioProfile
        			let radioProfile = await doLoadRadioProfile(radioId, hospitalId);
        			//radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
        			let userProfile = await doLoadUserProfile(userId);

        			//Patient Profile
        			let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: patientId}});
        			let patientNameEN = patients[0].Patient_NameEN + ' ' + patients[0].Patient_LastNameEN;

              const msgCaseDetailPattern = 'เคสจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';
        			let lineCaseDetaileMsg = uti.parseStr(msgCaseDetailPattern, userProfile.hospitalName, patientNameEN, targetCases[0].Case_StudyDescription, targetCases[0].Case_ProtocolName, targetCases[0].Case_BodyPart, targetCases[0].Case_Modality);

        			//Load Urgent Profile
        			let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: urgenttypeId}});
              let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);

              doCreatetaskAction(caseId, userProfile, radioProfile, triggerParam, newCaseStatusId, lineCaseDetaileMsg);

            } else if ([3, 4, 7].indexOf(newCaseStatusId) >= 0) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
              if (newCaseStatusId == 3) {
                let techUserLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {	userId: targetCases[0].userId}});
                if (techUserLines.length > 0) {
                  let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: targetCases[0].patientId}});
                  let patientNameEN = patients[0].Patient_NameEN + ' ' + patients[0].Patient_LastNameEN;
                  let msgFormat = 'แจ้งเตือน เคสใหม่\nผู้ป่วยชื่อ %s\nได้รับการปฏิเสธจากรังสีแพทย์ครับ\nคุณสามารถใช้บริการอื่นจากเมนูครับ';
                  let lineCaseMsg = uti.parseStr(msgFormat, patientNameEN);
                  let lineUserId = techUserLines[0].UserId;
                  let lineMsg = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.mainMenu);
                  await lineApi.pushConnect(lineUserId, lineMsg);
                }
              }
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 2: //Accepted -> 4, 5
            if ([4, 5].indexOf(newCaseStatusId) >= 0){
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
              //let radioProfile = await doLoadRadioProfile(radioId, hospitalId);
              let userProfile = await doLoadUserProfile(userId);
              let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: targetCases[0].patientId}});
              let patientNameEN = patients[0].Patient_NameEN + ' ' + patients[0].Patient_LastNameEN;
              if (newCaseStatusId == 4) {
                // Expired Case have Action in CaseTask already.
              } else if (newCaseStatusId == 5) {
                let refreshSuccessCase = {type: 'refresh', section: 'ReadSuccessDiv', statusId: newCaseStatusId, caseId: caseId};
                await socket.sendMessage(refreshSuccessCase, userProfile.username);
                if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
                  let msgFormat = 'แจ้งเตือน เคสใหม่\nผู้ป่วยชื่อ %s\nได้รับผลอ่านจากรังสีแพทย์แล้วครับ\nคุณสามารถใช้บริการอื่นจากเมนูครับ';
                  let lineCaseMsg = uti.parseStr(msgFormat, patientNameEN);
                  let lineMsg = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.mainMenu);
                  await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
                }
              }
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 3: //Not Accept -> 7
          case 4: //Expired -> 7
            if (newCaseStatusId == 7) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
              let refreshCancelCase = {type: 'refresh', section: 'ReadSuccessDiv', statusId: newCaseStatusId, caseId: caseId};
              await socket.sendMessage(refreshCancelCase, ur[0].username);
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 5: //Success -> 6
            if (newCaseStatusId == 6) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              tasks.removeTaskByCaseId(caseId);
              let refreshCloseCase = {type: 'refresh', section: 'ReadSuccessDiv', statusId: newCaseStatusId, caseId: caseId};
              await socket.sendMessage(refreshCloseCase, ur[0].username);
            }
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 6: //Closed
            res.json({Result: "OK", status: {code: 200}});
          break;
          case 7: //Cancel -> 1
            if (newCaseStatusId == 1) {
              await Case.update(caseStatusChange, { where: { id: caseId } });
              const msgCaseDetailFormat = 'เคสใหม่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';

              // Notify Case Owner Feedback
        			let refreshNewCase = {type: 'refresh', section: 'ReadWaitDiv', statusId: newcaseStatusId, caseId: caseId};
        			await socket.sendMessage(refreshNewCase, ur[0].username);

        			//Load Radio radioProfile
        			let radioProfile = await doLoadRadioProfile(radioId, hospitalId);
        			//radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
        			let userProfile = await doLoadUserProfile(userId);

        			//Patient Profile
        			let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: patientId}});
        			let patientNameEN = patients[0].Patient_NameEN + ' ' + patients[0].Patient_LastNameEN;

        			let lineCaseDetaileMsg = uti.parseStr(msgCaseDetailFormat, userProfile.hospitalName, patientNameEN, targetCases[0].Case_StudyDescription, targetCases[0].Case_ProtocolName, targetCases[0].Case_BodyPart, targetCases[0].Case_Modality);

        			//Load Urgent Profile
        			let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: urgenttypeId}});

              if (radioProfile.config.acctype === 'n') {
        			  //Create Task Schedule
        			  let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);

        			  doCreatetaskAction(caseId, userProfile, radioProfile, triggerParam, newcaseStatusId, lineCaseDetaileMsg);

        			} else if (radioProfile.config.acctype === 'y') {
        			  let acceptedCaseStatus = await doCallCaseStatusByName('Accepted');
        			  let acceptedCaseStatusId = acceptedCaseStatus[0].id;
                let caseAcceptStatusChange = { casestatusId: acceptedCaseStatusId, Case_DESC: 'Case Status Change with Auto Accept Profile.'};
                await Case.update(caseAcceptStatusChange, { where: { id: caseId } });
        			  let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);

        			  doCreatetaskAction(caseId, userProfile, radioProfile, triggerParam, acceptedCaseStatusId, lineCaseDetaileMsg);
        			}
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
                    const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                    const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                  }
                } else if (value.indexOf('*') == (value.length-1)) {
                  let searchVal = value.substring(0, (value.length-1));
                  if (item.patient.Patient_NameEN.indexOf(searchVal) >= 0) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                    const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                  }
                } else {
                  if (item.patient.Patient_NameEN === value) {
                    const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                    const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                    const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                    const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                    caseResults.push({case: item, reff: refes[0], owner: owners[0]});
                  }
                }
              } else if (key === 'PatientHN') {
                if (item.patient.Patient_HN === value) {
                  const refUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.Case_RefferalId}});
                  const refes = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: refUser[0].userinfoId}});
                  const ownerUser = await db.users.findAll({ attributes: ['userinfoId'], where: {id: item.userId}});
                  const owners = await db.userinfoes.findAll({ attributes: ['id', 'User_NameTH', 'User_LastNameTH'], where: {id: ownerUser[0].userinfoId}});
                  caseResults.push({case: item, reff: refes[0], owner: owners[0]});
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

//add insert API
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        doCallCaseStatusByName('New').then(async (newcaseStatus) => {
          const newcaseStatusId = newcaseStatus[0].id;
          const newCase = req.body.data;
          const userId = req.body.userId;
          const radioId = newCase.Case_RadiologistId;
          const msgCaseDetailFormat = 'เคสใหม่\nจากโรงพยาบาล %s\nผู้ป่วยชื่อ %s\nStudyDescription %s\nProtocolName %s\nBodyPart %s\nModality %s\n';

          //Insert New Case
          let adCase = await Case.create(newCase);
          let hospitalId = req.body.hospitalId;
          let patientId = req.body.patientId;
          let urgenttypeId = req.body.urgenttypeId;
          let cliamerightId = req.body.cliamerightId;
          let setupCaseTo = { hospitalId: hospitalId, patientId: patientId, userId: userId, cliamerightId: cliamerightId, urgenttypeId: urgenttypeId};
          await Case.update(setupCaseTo, { where: { id: adCase.id } });
          await adCase.setCasestatus(newcaseStatus[0]);

          // Notify Case Owner Feedback
          let refreshNewCase = {type: 'refresh', section: 'ReadWaitDiv', statusId: newcaseStatusId, caseId: adCase.id};
          await socket.sendMessage(refreshNewCase, ur[0].username);

          //Load Radio radioProfile
          let radioProfile = await doLoadRadioProfile(radioId, hospitalId);
          //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
          let userProfile = await doLoadUserProfile(userId);

          //Patient Profile
          let patients = await db.patients.findAll({attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: patientId}});
          let patientNameEN = patients[0].Patient_NameEN + ' ' + patients[0].Patient_LastNameEN;

          let lineCaseDetaileMsg = uti.parseStr(msgCaseDetailFormat, userProfile.hospitalName, patientNameEN, newCase.Case_StudyDescription, newCase.Case_ProtocolName, newCase.Case_BodyPart, newCase.Case_Modality);

          //Load Urgent Profile
          let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: urgenttypeId}});

          if (radioProfile.config.acctype === 'n') {
            //Create Task Schedule
            let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);

            doCreatetaskAction(adCase.id, userProfile, radioProfile, triggerParam, newcaseStatusId, lineCaseDetaileMsg);

          } else if (radioProfile.config.acctype === 'y') {
            let acceptedCaseStatus = await doCallCaseStatusByName('Accepted');
            let acceptedCaseStatusId = acceptedCaseStatus[0].id;
            await adCase.setCasestatus(acceptedCaseStatus[0]);
            let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);

            doCreatetaskAction(adCase.id, userProfile, radioProfile, triggerParam, acceptedCaseStatusId, lineCaseDetaileMsg);
          }

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

app.post('/radio/socket/(:radioId)', async (req, res) => {
  const radioId = req.params.radioId;
  const radUser = await db.users.findAll({ attributes: ['username'], where: {id: radioId}});
  const radioUsername = radUser[0].username;
  const radioSockets = await socket.filterUserSocket(radioUsername);
  res.json(radioSockets);
});

module.exports = ( dbconn, caseTask, monitor, websocket ) => {
  db = dbconn;
  tasks = caseTask;
  log = monitor;
  auth = require('./auth.js')(db, log);
  lineApi = require('../../lib/mod/lineapi.js')(db, log);
  uti = require('../../lib/mod/util.js')(db, log);
  common = require('./commonlib.js')(db, log);
  socket = websocket;
  Case = db.cases;
  return app;
}
