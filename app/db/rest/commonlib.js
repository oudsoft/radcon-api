const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');

var log, db;

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


module.exports = (dbconn, monitor) => {
	db = dbconn;
	log = monitor;
  return {
    doSearchRadioForHospital
  }
}
