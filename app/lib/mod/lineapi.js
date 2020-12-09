const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');

var db, log;

const mainMenu = [{id: 'x101', name: 'ลงทะเบียนใช้งาน'}, /*{id: 'x102', name: 'เคสของฉัน'},*/ {id: 'x103', name: 'อื่นๆ'}];
const registerMenu =[{id: 'x201', name: 'รังสีแพทย์'}, {id: 'x202', name: 'เจ้าหน้าที่เทคนิค'}, {id: 'x001', name: 'กลับ'}];
const otherMenu =[{id: 'x301', name: 'วิธีใช้งาน'}, {id: 'x302', name: 'แจ้งปัญหา'}, {id: 'x001', name: 'กลับ'}];
const acceptActionMenu =  [{id: 'x401', name: 'รับ'}, {id: 'x402', name: 'ไม่รับ'}];
const confirmMenu = [{id: 'x002', name: 'ตกลง'}, {id: 'x003', name: 'ยกเลิก'}];
const backMenu = [{id: 'x001', name: 'กลับ'}];

const getUserProfile = (userId) => {
  return new Promise(function(resolve, reject) {
    var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
    request({
      method: 'GET',
      uri: "https://api.line.me/v2/bot/profile/" + userId,
      headers: lineHeader
    }, (err, res, body) => {
      if (!err) {
        resolve(body);
      } else {
        reject(err);
      }
    });
  });
}

const replyConnect = (token, messages)=>{
  return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
		request({
			method: 'POST',
			uri: process.env.LINE_MESSAGING_API_URL + "/reply",
			headers: lineHeader,
			body: JSON.stringify({
				replyToken: token,
				messages: [messages]
			})
		}, (err, res, body) => {
			if (!err) {
				resolve({code: 200, response: body});
			} else {
				reject({code: 500, error: error});
			}
		});
	});
}

const pushConnect = (userId, messages) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
		request({
			method: 'POST',
			uri: process.env.LINE_MESSAGING_API_URL + "/push",
			headers: lineHeader,
			body: JSON.stringify({
				to: userId,
				messages: [messages]
			})
		}, (err, res, body) => {
			if (!err) {
				resolve({code: 200, response: body});
			} else {
				reject({code: 500, error: error});
			}
    });
	});
}

const createBotMenu = (question, action, items)=> {
  var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
    if (item.data) {
      ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.data;
    } else {
      ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.id;
    }
		ob.action.displayText = item.name;
		quickreplyItems.push(ob);
	});
	return {
		type: "text",
		text: (question)? question : "เชิญเลือกรายการครับ",
		quickReply: {
			items: quickreplyItems
		}
	}
}

module.exports = (dbconn, monitor) => {
  db = dbconn;
  log = monitor;

  return {
    mainMenu,
    registerMenu,
    otherMenu,
    acceptActionMenu,
    confirmMenu,
    backMenu,

    getUserProfile,
    replyConnect,
    pushConnect,
    createBotMenu
	}
}
