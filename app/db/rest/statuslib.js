/* statuslib.js */
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');

var log, db, tasks, uti, socket, lineApi, common;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doGetControlStatusAt = function(onStatus){
  return new Promise(async function(resolve, reject) {
    const nextCanProps = await common.doCanNextStatus(onStatus);
    resolve(nextCanProps);
  });
}

const doFilerStatusChange = function(from){
  return new Promise(async function(resolve, reject) {
    const nextCanProps = await common.doCanNextStatus(from);
    if (nextCanProps) {
      resolve(nextCanProps.next);
    } else {
      resolve([]);
    }
  });
}

const doCanChange = function(from, next){
  return new Promise(async function(resolve, reject) {
    let cando = await doFilerStatusChange(from);
    if (cando.length > 0) {
      if (cando.indexOf(Number(next)) > -1) {
        resolve(true);
      } else {
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

const doChangeCaseStatus = function(from, next, caseId, userId, remark){
  return new Promise(async function(resolve, reject) {
    let isCando = await doCanChange(from, next);
    if (isCando) {
      const caseStatusChange = { casestatusId: next, Case_DESC: remark};
      await db.cases.update(caseStatusChange, { where: { id: caseId } });
      let newKeepLog = { caseId : caseId,	userId : userId, from : from, to : next, remark : remark};
      await common.doCaseChangeStatusKeepLog(newKeepLog);
      let actions = await doActionAfterChange(from, next, caseId);
      resolve({change: {status: true}, actions: actions});
    } else {
      resolve({change: {status: false}});
    }
  });
}

const doActionAfterChange = function(fromStatus, onStatus, caseId) {
  return new Promise(async function(resolve, reject) {
    let actions = undefined;
    switch (Number(onStatus)) {
      case 1:
        actions = await onNewCaseEvent(caseId);
      break;
      case 2:
        actions = await onAcceptCaseEvent(caseId);
      break;
      case 3:
        actions = await onRejectCaseEvent(caseId);
      break;
      case 4:
        actions = await onExpiredCaseEvent(caseId);
      break;
      case 5:
        actions = await onSuccessCaseEvent(caseId);
      break;
      case 6:
        actions = await onCloseCaseEvent(caseId);
      break;
      case 7:
        actions = await onCancelCaseEvent(caseId);
      break;
      case 8:
        actions = await onOpenCaseEvent(caseId);
      break;
      case 9:
        actions = await onDraftCaseEvent(caseId);
      break;
      case 10:
        actions = await onViewCaseEvent(caseId);
      break;
      case 11:
      break;
      case 12:
      break;
    }
    resolve(actions);
  });
}

const onNewCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const newCase = targetCases[0];
    const userId = newCase.userId;
    const hospitalId = newCase.hospitalId;
    const radioId = newCase.Case_RadiologistId;
    const patientNameEN = newCase.patient.Patient_NameEN + ' ' + newCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);

    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    // Notify to Case Owner Feedback
    let refreshNewCase = {type: 'refresh', statusId: newCase.casestatusId, caseId: newCase.id};
    let userNotify = {type: 'notify', message: 'You Create new Case success.'};
    await socket.sendMessage(refreshNewCase, userProfile.username);
    await socket.sendMessage(userNotify, userProfile.username);

    let lineCaseDetaileMsg = uti.parseStr(common.msgNewCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, newCase.Case_StudyDescription, newCase.Case_ProtocolName, newCase.Case_BodyPart, newCase.Case_Modality);

    // Notify to Case Radiologist
    let radioNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshNewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    //Load Urgent Profile
    let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_AcceptStep', 'UGType_WorkingStep'], where: {id: newCase.urgenttypeId}});

    if (radioProfile.config.acctype === 'n') {
      //Create Task Schedule
      let triggerParam = JSON.parse(urgents[0].UGType_AcceptStep);

      let theTask = await common.doCreatetaskAction(caseId, userProfile, radioProfile, triggerParam, newCase.casestatusId, lineCaseDetaileMsg);

    } else if (radioProfile.config.acctype === 'y') {
      let acceptedCaseStatus = await common.doCallCaseStatusByName('Accepted');
      let acceptedCaseStatusId = acceptedCaseStatus[0].id;
      await newCase.setCasestatus(acceptedCaseStatus[0]);
      let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);

      let theTask = await common.doCreatetaskAction(caseId, userProfile, radioProfile, triggerParam, acceptedCaseStatusId, lineCaseDetaileMsg);

    }
    let actions = await doGetControlStatusAt(newCase.casestatusId);
    resolve(actions);
  });
}

const onAcceptCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshAccCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};
    let radioNotify = {type: 'notify', message: 'You Accept Case success.'};
    await socket.sendMessage(refreshAccCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.parseStr(common.msgAccCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    let hospitalNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshAccCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    //Load Urgent Profile
    let urgents = await db.urgenttypes.findAll({ attributes: ['UGType_WorkingStep'], where: {id: targetCase.urgenttypeId}});
    let triggerParam = JSON.parse(urgents[0].UGType_WorkingStep);

    let theTask = await common.doCreatetaskAction(caseId, userProfile, radioProfile, triggerParam, targetCase.asestatusId, lineCaseDetaileMsg);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onRejectCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshRejCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};
    let radioNotify = {type: 'notify', message: 'You Reject Case success.'};
    await socket.sendMessage(refreshRejCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    let hospitalNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshRejCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onExpiredCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let lineCaseDetaileMsg = uti.parseStr(common.msgNewCaseRadioDetailFormat, userProfile.hospitalName, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    await common.doCaseExpireAction(caseId, socket, targetCase.casestatusId, radioProfile, userProfile, lineCaseDetaileMsg, userProfile.hospitalName);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onSuccessCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshSucCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};
    let radioNotify = {type: 'notify', message: 'You can send Case Result success.'};
    await socket.sendMessage(refreshSucCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);

    let hospitalNotify = {type: 'notify', message: lineCaseDetaileMsg};
    await socket.sendMessage(refreshSucCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    if ((userProfile.lineUserId) && (userProfile.lineUserId !== '')) {
      let lineCaseMsg = lineCaseDetaileMsg + 'ได้รับผลอ่านจากรังสีแพทยแล้วครับ\nคุณสามารถใช้บริการอื่นจากเมนูครับ';
      let lineMsg = lineApi.createBotMenu(lineCaseMsg, 'quick', lineApi.mainMenu);
      await lineApi.pushConnect(userProfile.lineUserId, lineMsg);
    }
    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onCloseCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshCloseCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};
    /*
    let radioNotify = {type: 'notify', message: 'You can send CaseResult success.'};
    await socket.sendMessage(refreshSucCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'You can close Case Success.'};
    await socket.sendMessage(refreshCloseCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onCancelCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshCancelCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};
    log.info('refreshCancelCase=>' + JSON.stringify(refreshCancelCase));
    /*
    let radioNotify = {type: 'notify', message: 'You can send CaseResult success.'};
    await socket.sendMessage(refreshSucCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'You can cancel Case Success.'};
    await socket.sendMessage(refreshCancelCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onOpenCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshOpenCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};

    let radioNotify = {type: 'notify', message: 'You can open Case success.'};
    await socket.sendMessage(refreshOpenCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'doDisplayCustomUrgentResult case was open by radiologist.'};
    await socket.sendMessage(refreshOpenCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onDraftCaseEvent = function(caseId){
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshDraftCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};

    let radioNotify = {type: 'notify', message: 'You can Save Draft Result of Case success.'};
    await socket.sendMessage(refreshOpenCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'Your case had start draft result by radiologist.'};
    await socket.sendMessage(refreshOpenCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

const onViewCaseEvent = function(caseId) {
  return new Promise(async function(resolve, reject) {
    const caseInclude = [ {model: db.patients, attributes: ['Patient_NameEN', 'Patient_LastNameEN']}];
    const targetCases = await db.cases.findAll({include: caseInclude, where: {id: caseId}});
    const targetCase = targetCases[0];
    const userId = targetCase.userId;
    const hospitalId = targetCase.hospitalId;
    const radioId = targetCase.Case_RadiologistId;
    const patientNameEN = targetCase.patient.Patient_NameEN + ' ' + targetCase.patient.Patient_LastNameEN;

    //Load Radio radioProfile
    let radioProfile = await common.doLoadRadioProfile(radioId, hospitalId);
    //radioProfile = {userId: radioId, username: radioUsers[0].username, radioUsers[0].User_NameEN, radioUsers[0].User_LastNameEN, lineUserId: radioUserLines[0].UserId, config: configs[0]};
    let userProfile = await common.doLoadUserProfile(userId);

    let refreshViewCase = {type: 'refresh', statusId: targetCase.casestatusId, caseId: targetCase.id};

    let radioNotify = {type: 'notify', message: 'Your Result Case was view by owner case.'};
    await socket.sendMessage(refreshViewCase, radioProfile.username);
    await socket.sendMessage(radioNotify, radioProfile.username);

    /*
    let lineCaseDetaileMsg = uti.parseStr(common.msgRejCaseHospitalDetailPattern, patientNameEN, targetCase.Case_StudyDescription, targetCase.Case_ProtocolName, targetCase.Case_BodyPart, targetCase.Case_Modality);
    */

    let hospitalNotify = {type: 'notify', message: 'You can view Result of case success.'};
    await socket.sendMessage(refreshViewCase , userProfile.username);
    await socket.sendMessage(hospitalNotify, userProfile.username);

    let actions = await doGetControlStatusAt(targetCase.casestatusId);
    resolve(actions);
  });
}

module.exports = (dbconn, monitor, casetask, websocket) => {
	db = dbconn;
	log = monitor;
  tasks = casetask;
  socket = websocket;
  uti = require('../../lib/mod/util.js')(db, log);
  lineApi = require('../../lib/mod/lineapi.js')(db, log);
  common = require('./commonlib.js')(db, log, tasks);
  return {
    doFilerStatusChange,
    doCanChange,
    doChangeCaseStatus,
    onNewCaseEvent,
    onAcceptCaseEvent,
    onRejectCaseEvent,
    onExpiredCaseEvent,
    onSuccessCaseEvent,
    onCloseCaseEvent,
    onCancelCaseEvent,
    onOpenCaseEvent,
    onDraftCaseEvent,
    onViewCaseEvent
  }
}
