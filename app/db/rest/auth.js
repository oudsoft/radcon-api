require('dotenv').config();
const crypto = require('crypto');
const jwt = require("jwt-simple");

var db, User, Hospital, Usertype, Userstatus, Userinfo, log;

const doExistUser = function(username){
  return new Promise(async function(resolve, reject) {
    const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };
    const userInclude = [{ model: Hospital, attributes: excludeColumn}, {model: Usertype, attributes: excludeColumn}, {model: Userstatus, attributes: excludeColumn}, {model: Userinfo, attributes: excludeColumn}];
    try {
      const users = await User.findAll({ include: userInclude, attributes: excludeColumn, where: {	username: username}});
      resolve(users);
    } catch(error) {
      reject(error)
    }
  });
}

const doVerifyUser = function (username, password) {
  return new Promise(function(resolve, reject) {
    doExistUser(username).then((users) => {
      //log.info(users);
      if (users.length > 0) {
        const isCorect = users[0].correctPassword(password);
        resolve({ result: isCorect, data: users[0] });
      } else {
        resolve({ result: false, reson: 'Invalid username'});
      }
    });
  });
}

const doEncodeToken = function(username) {
  const payload = {
		sub: username,
		iat: new Date().getTime(), //มาจากคำว่า issued at time (สร้างเมื่อ)
	};
	const payloadEncode = jwt.encode(payload, process.env.SECRET_KAY);
	log.info('payloadEncode => ' + payloadEncode);
  return payloadEncode;
};

const doDecodeToken = function(token){
  log.info('You send token => ' + token);
  const payloadDecode = jwt.decode(token, process.env.SECRET_KAY);
  log.info('payloadDecode stringify => ' + JSON.stringify(payloadDecode));
  let yourUsername = payloadDecode.sub;
  return new Promise(async function(resolve, reject) {
    try {
      const users = await User.findAll({ where: {	username: yourUsername}});
      resolve(users);
    } catch(error) {
      log.info('Can not found username = ' + yourUsername);
      reject(error);
    }
  });
}

const doGetHospitalFromId = function (id){
  return new Promise(async function(resolve, reject) {
    try {
      const hosp = await Hospital.findAll({ where: {	id: id}});
      resolve(hosp);
    } catch(error) {
      reject(error)
    }
  });
}

const doGetUsertypeById = function (typeId){
  return new Promise(async function(resolve, reject) {
    try {
      const types = await Usertype.findAll({ where: {	id: typeId}});
      resolve(types);
    } catch(error) {
      reject(error)
    }
  });
}

const doGetUserstatusActive = function(){
  return new Promise(async function(resolve, reject) {
    try {
      const statuses = await Userstatus.findAll({ where: {	UserStatus_Name: 'Active'}});
      resolve(statuses);
    } catch(error) {
      reject(error)
    }
  });
}

const setSaltAndPassword = user => {
  if (user.changed('password')) {
    user.salt = User.generateSalt()
    user.password = User.encryptPassword(user.password(), user.salt())
  }
}

const resetAdmin = async (username, newPassword) => {
  let yourNewPassword = 'Limparty';
  let anyuser = await User.findAll({ where: {	username: username}});
  let yourSalt = anyuser[0].salt();
  let yourEncryptPassword = User.encryptPassword(newPassword, yourSalt);
  log.info('yourEncryptPassword => ' + yourEncryptPassword);
  await User.update({password: yourEncryptPassword}, { where: { username: username } });
}

module.exports = ( dbconn, monitor ) => {
  db = dbconn;
  log = monitor;

  User = db.users;
  Hospital = db.hospitals;
  Usertype = db.usertypes;
  Userstatus = db.userstatuses;
  Userinfo = db.userinfoes

  return {
    setSaltAndPassword,
    doExistUser,
    doVerifyUser,
    doEncodeToken,
    doDecodeToken,
    doGetHospitalFromId,
    doGetUsertypeById,
    doGetUserstatusActive,
    resetAdmin
  }
}
