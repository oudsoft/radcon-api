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

const sessionHandleStorages = [];
/*
  Object in sessionHandleStorages
  {userId, content: {mode, }}
*/

const doFindSessionHandle = (userId)=>{
  return new Promise(async function(resolve, reject) {
    let session = [];
    session = await sessionHandleStorages.find((handle) => {
      return (handle.userId === userId);
    })
    resolve(session);
  });
}

const removeSessionHandle = (userId)=>{
  return new Promise(async function(resolve, reject) {
    let filterSession = await sessionHandleStorages.filter((handle, ind) => {
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
      let replyStatus = lineApi.replyConnect(token, msg);
      if (replyStatus.code == 200) {
        resolve({code: 200});
      } else if (replyStatus.code == 500) {
        resolve({code: 500});
      } else {
        reject({error: 'Connect Error'})
      }
    } catch(error) {
      log.error(error);
      res.json({status: {code: 500}, error: error});
    }
	});
}

const pushAction = (userId, msg) => {
	return new Promise(function(resolve, reject) {
    try {
      let replyStatus = lineApi.pushConnect(userId, msg);
      if (replyStatus.code == 200) {
        resolve({code: 200});
      } else if (replyStatus.code == 500) {
        resolve({code: 500});
      } else {
        reject({error: 'Connect Error'})
      }
    } catch(error) {
      log.error(error);
      res.json({status: {code: 500}, error: error});
    }
	});
}

const postbackMessageHandle = (userId, replyToken, cmds)=>{
  return new Promise(function(resolve, reject) {
    /* ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.id, */
    /* var cmds = userEvent.postback.data.split("&"); */
    var action = (cmds[0].split("="))[1];
  	var cmdCode = (cmds[1].split("="))[1];
  	var data = (cmds[2].split("="))[1];
    switch (action) {
      case 'quick':
        var action;
        var guideMsg;
        switch (cmdCode) {
          case 'x001':
            var backToMainMunuMsg = 'เชิญเลือกคำสั่งจากเมนูด้านล่างครับ';
            action = 'quick';
            replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainmenu));
            resolve();
          break;
          case 'x002':
            guideMsg = 'โปรดป้อน username ที่ต้องการลงทะเบียนใช้งานคู่กับ LINE บัญชีนี้ครับ';
            replyAction(replyToken, guideMsg);
            resolve();
          break;
          case 'x003':
            var backToMainMunuMsg = 'เชิญเลือกคำสั่งจากเมนูด้านล่างครับ';
            action = 'quick';
            replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainmenu));
            resolve();
          break;
          case 'x101':
            var regiterMunuMsg = 'เชิญเลือกลงทะเบียนตามประเภทผู้ใช้งานจากเมนูด้านล่างครับ';
            action = 'quick';
            replyAction(replyToken, lineApi.createBotMenu(regiterMunuMsg, action, lineApi.registerMenu));
            resolve();
          break;
          case 'x102':
            resolve();
          break;
          case 'x103':
            var otherMunuMsg = 'เชิญเลือกใช้บริการอื่นๆ จากเมนูด้านล่างครับ';
            action = 'quick';
            replyAction(replyToken, lineApi.createBotMenu(otherMunuMsg, action, lineApi.otherMenu));
            resolve();
          break;
          case 'x201':
            var userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 4}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของรังสีแพทย์ที่ต้องการลงทะเบียนใช้งานคู่กับ LINE บัญชีนี้ครับ';
            replyAction(replyToken, guideMsg);
            resolve();
          break;
          case 'x202':
            var userHandle = {userId: userId, content: {mode: 'key', field: 'username', usertype: 2}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'โปรดป้อน username ของเจ้าหน้าที่เทคนิคที่ต้องการลงทะเบียนใช้งานคู่กับ LINE บัญชีนี้ครับ';
            replyAction(replyToken, guideMsg);
            resolve();
          break;
          case 'x301':
            /* วิธีใช้งาน */
            var hid = "h00";
    				var helper = require('./mod/userhelp.json');
            var userHelpText = 'วิธีใช้งานมีดังนี้ครับ\n\n'
    				userHelpText += helper[hid];
            userHelpText += '\n\n หากต้องการใช้บริการใดๆ ของผม โปรดเลือกจากเมนูครับ';
            action = 'quick';
            replyAction(replyToken, lineApi.createBotMenu(backToMainMunuMsg, action, lineApi.mainmenu));
            resolve();
          break;
          case 'x302':
            /* แจ้งปัญหาการใช้าน*/
            var userHandle = {userId: userId, content: {mode: 'key', field: 'report'}};
            sessionHandleStorages.push(userHandle);
            guideMsg = 'ป้อนปัญหาการใช้งานระบบฯ ส่งเข้ามาได้เลยครับ';
            replyAction(replyToken, guideMsg);
            resolve();
          break;
          default:
            resolve();
        }
      break;
    }
  });
}

const textMessageHandle = (userId, replyToken, userText)=>{
  return new Promise(async (resolve, reject)=>{
    let sessionHanle = await doFindSessionHandle(userId);
    if (sessionHanle.length > 0) {
      let userMode = sessionHanle[0].content.mode;
      let action;
      let replyMsg;
      switch (userMode) {
        case 'key':
          let field = sessionHanle[0].content.field;
          if (field === 'username') {
            let usertype = sessionHanle[0].content.usertype;
            //search username from db
            const users = await db.users.findAll({ attributes: excludeColumn, where: {	username: userText}});
            if (users.length > 0){
              let newLineUser = {UserId: userText};
              let adLineUser = await db.lineusers.create(newLineUser);
              await db.lineusers.update({userId: users[0].id}, { where: { id: adLineUser.id } });
              action = 'quick';
              replyMsg = 'ระบบฯ ได้ทำการได้ทำการลงทะเบียนใช้งานระบบฯ คู่กับ Line ของคุณเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
              await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainmenu));
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
            action = 'quick';
            replyMsg = 'ระบบฯ ได้ทำการบันทึกปัญหาการใช้งานของคุณและแจ้งไปยังผู้รับผิดชอบเป็นที่เรียบร้อยแล้วครับ\nหากต้องการใช้บริการอย่างอื่นโปรดเลือกคำสั่งจากเมนูครับ'
            await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainmenu));
            await removeSessionHandle(userId);
          }
          break;
        default:
          action = 'quick';
          replyMsg = 'ต้องขออภัยด้วยจริงๆ ครับ ผมไมอาจ่เข้าใจในสิ่งที่คุณส่งเข้ามา โปรดเลือกใช้บริการของผมจากเมนูครับ'
          await replyAction(replyToken, lineApi.createBotMenu(replyMsg, action, lineApi.mainmenu));
      }
    } else {
      reject({error: 'user session not found'});
    }
  });
}

var db, Task, log, auth;

app.get('/', function(req, res) {
	res.status(200).send("OK");
});

app.post('/', function(req, res) {
  const lineApi = require('./mod/lineapi.js')(req, res);
  var replyMessage;
	var question;
  let replyToken = userEvent.replyToken;
	let userId = userEvent.source.userId;
	let destination = req.body.destination;
  let userEvent = req.body.events[0];
  switch (userEvent) {
    case 'message':
      let userMessageType = userEvent.message.type;
      switch (userMessageType) {
        case 'text':
          var userText = userEvent.message.text;
          textMessageHandle(userId, replyToken, userText);
        break;
        case 'image':
          var imageId = userEvent.message.id;
          var unSupportMsg = 'ต้องขออภัยระบบยังรองรับฟังก์ชั่นนี้ในขณะนี้\nโปรดใช้เมนูจากด้านล่างครับ';
          var action = 'quick';
          replyAction(replyToken, lineApi.createBotMenu(unSupportMsg, action, lineApi.mainmenu));
        break;
      }
    break;
    case 'postback':
      var cmds = userEvent.postback.data.split("&");
      postbackMessageHandle(userId, replyToken, cmds);
    break;
    case 'follow':
      lineApi.getUserProfile(userId).then(function(userdata) {
        var userProfile = JSON.parse(userdata);
        var displayName = userProfile.displayName;
        var intro = "สวัสดีครับคุณ " + displayName + "\n" + "Radconnext เป็นเกียรติอย่างยิ่งที่ได้รับใช้คุณ\nโปรดเลือกทำรายการจากเมนูด้านล่างได้เลยครับ";
        var action = 'quick';
        replyAction(replyToken, lineApi.createBotMenu(intro, action, lineApi.mainmenu));
      });
    break;
    case 'unfollow':
      lineApi.getUserProfile(userId).then(function(userdata) {
        var userProfile = JSON.parse(userdata);
        var displayName = userProfile.displayName;
        var replyUnfollowMsg = "Radconnext ขอขอบพระคุณ คุณ " + displayName + "\n" + "เป็นอย่างสูงที่ไดมีโอกาส้รับใช้คุณ\nคุณสามารถกลับมาใช้บริการได้ใหม่ทุกเมื่อครับ";
        replyAction(replyToken, replyUnfollowMsg);
      });
    break;
  }
});

module.exports = ( taskCase, dbconn, monitor ) => {
  db = dbconn;
  log = monitor;
  auth = require('../db/rest/auth.js')(db, log);
  Task = taskCase;
  return app;
}
