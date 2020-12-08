const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');

module.exports = function ( req, res ) {
  const mainMenu = [{id: 'x101', name: 'ลงทะเบียนใช้งาน'}, /*{id: 'x102', name: 'เคสของฉัน'},*/ {id: 'x103', name: 'อื่นๆ'}];
  const registerMenu =[{id: '201', name: 'รังสีแพทย์'}, {id: 'x202', name: 'เจ้าหน้าที่เทคนิค'}, {id: 'x001', name: 'กลับ'}];
  const otherMenu =[{id: 'x301', name: 'วิธีใช้งาน'}, {id: 'x302', name: 'แจ้งปัญหา'}, {id: 'x001', name: 'กลับ'}];
  const confirmMenu = [{id: 'x002', name: 'ตกลง'}, {id: 'x003', name: 'ยกเลิก'}];
  const backMenu = [{id: 'x001', name: 'กลับ'}];

  const getUserProfile = function(userId) {
    return new Promise(function(resolve, reject) {
      var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.LINE_API_ACCESS_TOKEN};
      request({
        method: 'GET',
        uri: "https://api.line.me/v2/bot/profile/" + userid,
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
  				resolve({code: 200});
  			} else {
  				resolve({code: 500, error: error});
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
  		}).then(function(){
  			resolve({code: 200});
  		}).catch(function(error){
  			resolve({code: 500, error: error});
  		});
  	});
  }

  const createBotMenu = function(question, action, items) {
    var quickreplyItems = []
  	items.forEach(function(item){
  		var ob = {type: "action", action: {}};
  		ob.action.type = "postback";
  		ob.action.label = item.name;
  		ob.action.data = "action=" + action + "&itemid=" + item.id + "&data=" + item.id,
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

  return {
    mainMenu,
    otherMenu,
    backMenu,

    getUserProfile,
    replyConnect,
    createBotMenu
	}
}
