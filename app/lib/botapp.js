const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

let sessionHandleStorages = [];
/*
  Object in sessionHandleStorages
  {userId, content: {mode, }}
*/

var db, Task, log, auth, lineApi, uti;

const doFindSessionHandle = (userId)=>{
  return new Promise(async function(resolve, reject) {
    let session = [];
    session = await sessionHandleStorages.find((handle, index) => {
      if (handle.userId === userId) {
        return handle;
      }
    })
    resolve(session);
  });
}

const removeSessionHandle = (userId)=>{
  return new Promise(async function(resolve, reject) {
    let filterSession = await sessionHandleStorages.filter((handle, index) => {
      if (handle.userId !== userId) {
        return handle;
      }
    });
    sessionHandleStorages = filterSession;
    resolve(sessionHandleStorages);
  });
}

const replyAction = (token, msg) => {
	return new Promise(async function(resolve, reject) {
    try {
      let replyStatus = await lineApi.replyConnect(token, msg);
      resolve(replyStatus);
    } catch(error) {
      log.error('Line replyAcction Error => ' + JSON.stringify(error));
      reject(error);
    }
	});
}

const pushAction = (userId, msg) => {
	return new Promise(async function(resolve, reject) {
    try {
      let replyStatus = await lineApi.pushConnect(userId, msg);
      resolve(replyStatus);
    } catch(error) {
      log.error('Line pushAcction Error => ' + JSON.stringify(error));
      reject(error);
    }
	});
}

const doCreateRadconToken = (userId) => {
  return new Promise(async function(resolve, reject) {
    const userLines = await db.lineusers.findAll({ attributes: ['id', 'userId'], where: {	UserId: userId}});
    const users = await db.users.findAll({ attributes: ['id', 'username'], where: {	id: userLines[0].userId}});
    let yourToken = auth.doEncodeToken(users[0].username);
    resolve({userId: users[0].id, token: yourToken});
  });
}

const postbackMessageHandle = (userId, replyToken, cmds)=>{
  return new Promise(async function(resolve, reject) {
    /* ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.id, */
    /* var cmds = userEvent.postback.data.split("&"); */
    var action = (cmds[0].split("="))[1];
  	var cmdCode = (cmds[1].split("="))[1];
  	var data = (cmds[2].split("="))[1];
    switch (action) {
      case 'quick':
        var action;
        var guideMsg;
        var lineMessage;
        var yourToken;
        var rqParams;
        var rqBody;
        var caseRes;
        var actionReturnText;
        switch (cmdCode) {
          case 'x001':
            var backToMainMunuMsg = 'เชิญเลือกคำสั่งจากเมนูด้านล่างครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainMenu));
            resolve();
          break;
          case 'x002':
            guideMsg = 'โปรดป้อน username ที่ต้องการลงทะเบียนใช้งานคู่กับ LINE บัญชีนี้ครับ';
            await replyAction(replyToken, guideMsg);
            resolve();
          break;
          case 'x003':
            var backToMainMunuMsg = 'เชิญเลือกคำสั่งจากเมนูด้านล่างครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainMenu));
            resolve();
          break;
          case 'x101':
            var regiterMunuMsg = 'เชิญเลือกลงทะเบียนตามประเภทผู้ใช้งานจากเมนูด้านล่างครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(regiterMunuMsg, action, lineApi.registerMenu));
            resolve();
          break;
          case 'x102':
            resolve();
          break;
          case 'x103':
            var otherMunuMsg = 'เชิญเลือกใช้บริการอื่นๆ จากเมนูด้านล่างครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(otherMunuMsg, action, lineApi.otherMenu));
            resolve();
          break;
          case 'x201':
            var userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 4}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของรังสีแพทย์ที่ต้องการลงทะเบียนครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x202':
            var userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 2}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของเจ้าหน้าที่เทคนิคที่ต้องการลงทะเบียนครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x301':
            /* วิธีใช้งาน */
            var hid = "h00";
    				var helper = require('./mod/userhelp.json');
            var userHelpText = 'วิธีใช้งานมีดังนี้ครับ\n\n'
    				userHelpText += helper[hid];
            userHelpText += '\n\nหากต้องการใช้บริการใดๆ ของผม โปรดเลือกจากเมนูครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(userHelpText, action, lineApi.mainMenu));
            resolve();
          break;
          case 'x302':
            /* แจ้งปัญหาการใช้าน*/
            var userHandle = {userId: userId, content: {mode: 'key', field: 'report'}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'ป้อนปัญหาการใช้งานระบบฯ ส่งเข้ามาได้เลยครับ';
            lineMessage = { type: "text",	text: guideMsg };
            await replyAction(replyToken, lineMessage);
            resolve();
          break;
          case 'x401':
            /* radio accept new cse*/
            yourToken = await doCreateRadconToken(userId);
            rqBody = { userId: yourToken.userId, caseId: data, casestatusId: 2, caseDescription: 'Accept by Line Bot'};
            rqParams = {
              method: 'post',
              uri: 'https://' + process.env.DOMAIN_NAME + '/api/cases/status/' + data,
              Authorization: yourToken.token,
              body: rqBody
            }
            caseRes = uti.proxyRequest(rqParams);
            log.info('your Accept caseRes => ' + JSON.stringify(caseRes));
            actionReturnText = 'ดำเนินการตอบรับเคสใหม่ไปเรียบร้อยแล้ว\nหากต้องการใช้บริการอื่นๆ โปรดเลือกจากเมนูครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.mainMenu));
            resolve();
          break;
          case 'x402':
            /* radio not accept new cse*/
            yourToken = await doCreateRadconToken(userId);
            rqBody = { userId: yourToken.userId, caseId: data, casestatusId: 3, caseDescription: 'Not Accept by Line Bot'};
            rqParams = {
              method: 'post',
              uri: 'https://' + process.env.DOMAIN_NAME + '/api/cases/status/' + data,
              Authorization: yourToken.token,
              body: rqBody
            }
            caseRes = uti.proxyRequest(rqParams);
            log.info('your Not Accept caseRes => ' + JSON.stringify(caseRes));
            actionReturnText = 'ดำเนินการปฏิเสธรับเคสใหม่ไปเรียบร้อยแล้ว\nหากต้องการใช้บริการอื่นๆ โปรดเลือกจากเมนูครับ';
            action = 'quick';
            await replyAction(replyToken, lineApi.createBotMenu(actionReturnText, action, lineApi.mainMenu));
            resolve();
          break;
        }
      break;
    }
  });
}

const textMessageHandle = (userId, replyToken, userText)=>{
  return new Promise(async (resolve, reject)=>{
    let action;
    let replyMsg;
    let sessionHanle = await doFindSessionHandle(userId);
    if (sessionHanle) {
      let userMode = sessionHanle.content.mode;
      switch (userMode) {
        case 'key':
          let field = sessionHanle.content.field;
          if (field === 'username') {
            let usertype = sessionHanle.content.usertype;
            //search username from db
            const users = await db.users.findAll({ attributes: ['id', 'username', 'usertypeId'], where: {	username: userText, usertypeId: usertype}});
            if (users.length > 0){
              const userLines = await db.lineusers.findAll({ attributes: ['id', 'UserId'], where: {	id: users[0].id}});
              if (userLines.length == 0) {
                let newLineUser = {UserId: userId};
                let adLineUser = await db.lineusers.create(newLineUser);
                await db.lineusers.update({userId: users[0].id}, { where: { id: adLineUser.id } });
              } else {
                await db.lineusers.update({UserId: userText}, { where: { id: users[0].id } });
              }
              action = 'quick';
              replyMsg = 'ระบบฯ ได้ทำการได้ทำการลงทะเบียน ' + userText + ' ใช้งานระบบฯ คู่กับ Line ของคุณเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
              await removeSessionHandle(userId);
            } else {
              action = 'quick';
              replyMsg = 'ระบบฯ ไม่พบ username=' + userText + '\nคุณต้องการลงทะเบียนใช้งานด้วย username อื่นหรือไม่ครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.confirmMenu));
            }
          } else if (field === 'report') {
            let userdata = await lineApi.getUserProfile(userId);
            let userProfile = JSON.parse(userdata);
            let displayName = userProfile.displayName;
            let reportMsg = displayName + ' แจ้งปัญหาเข้ามาว่า ' + userText;
            log.info(reportMsg);
            //LINE_ADMIN_USERID=U2ffb97f320994da8fb3593cd506f9c43
            let msgToAdmin = { type: "text",	text: reportMsg };
            await pushAction(process.env.LINE_ADMIN_USERID, msgToAdmin);
            action = 'quick';
            replyMsg = 'ระบบฯ ได้ทำการบันทึกปัญหาการใช้งานของคุณและแจ้งไปยังผู้รับผิดชอบเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
            await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
            await removeSessionHandle(userId);
          }
        break;
      }
    } else {
      action = 'quick';
      replyMsg = 'ต้องขออภัยด้วยจริงๆ ครับ ผมไมอาจ่เข้าใจในสิ่งที่คุณส่งเข้ามา โปรดเลือกใช้บริการของผมจากเมนูครับ'
      await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainMenu));
    }
  });
}

app.get('/', function(req, res) {
	res.status(200).send("OK");
});

app.post('/', async function(req, res) {
  var replyMessage;
	var question;
  var userdata;
  var userProfile;
  var displayName;

  let userEvent = req.body.events[0];
  let replyToken = userEvent.replyToken;
	let userId = userEvent.source.userId;
	let destination = req.body.destination;
  switch (userEvent.type) {
    case 'message':
      let userMessageType = userEvent.message.type;
      switch (userMessageType) {
        case 'text':
          var userText = userEvent.message.text;
          await textMessageHandle(userId, replyToken, userText);
        break;
        case 'image':
          var imageId = userEvent.message.id;
          var unSupportMsg = 'ต้องขออภัยระบบยังรองรับฟังก์ชั่นนี้ในขณะนี้\nโปรดใช้เมนูจากด้านล่างครับ';
          var action = 'quick';
          await replyAction(replyToken, lineApi.createBotMenu(unSupportMsg, action, lineApi.mainMenu));
        break;
      }
    break;
    case 'postback':
      var cmds = userEvent.postback.data.split("&");
      await postbackMessageHandle(userId, replyToken, cmds);
    break;
    case 'follow':
      try {
        userdata = await lineApi.getUserProfile(userId);
        userProfile = JSON.parse(userdata);
        displayName = userProfile.displayName;
        var intro = "สวัสดีครับคุณ " + displayName + "\n" + "Radconnext เป็นเกียรติอย่างยิ่งที่ได้รับใช้คุณ\nโปรดเลือกทำรายการจากเมนูด้านล่างได้เลยครับ";
        var action = 'quick';
        await replyAction(replyToken, lineApi.createBotMenu(intro, action, lineApi.mainMenu));
      } catch (err) {
        log.info('User Follow Error => ' + JSON.stringify(err));
      }
    break;
    case 'unfollow':
      try {
        /*
        userdata = await lineApi.getUserProfile(userId);
        userProfile = JSON.parse(userdata);
        displayName = userProfile.displayName;
        var replyUnfollowMsg = "Radconnext ขอขอบพระคุณ คุณ " + displayName;
        replyUnfollowMsg += "\nเป็นอย่างสูงที่ไดมีโอกาส้รับใช้คุณ\nคุณสามารถกลับมาใช้บริการได้ใหม่ทุกเมื่อเลยครับ";
        await pushAction(userId, replyUnfollowMsg);
        */
      } catch (err) {
        log.info('User Unfollow Error => ' + JSON.stringify(err));
      }
    break;
  }
});

module.exports = ( taskCase, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('../db/rest/auth.js')(db, log);
  lineApi = require('./mod/lineapi.js')(db, log);
  uti = require('./mod/util.js')(db, log);
  Task = taskCase;
  return app;
}
