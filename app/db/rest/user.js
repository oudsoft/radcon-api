const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, User, log, auth;

const excludeColumn = { exclude: [ 'updatedAt', 'createdAt'] };

//
app.get('/(:userId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const userId = req.params.userId;
          const anyUser = await db.users.findAll({ attributes: ['id', 'userinfoId', 'usertypeId'], where: {id: userId}});
          const youUser = await db.userinfoes.findAll({ where: {id: anyUser[0].userinfoId}});
          let record = {user: anyUser[0], info: youUser[0], type: anyUser[0].usertypeId}
          res.json({status: {code: 200}, Record: record});
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

//List API
app.post('/list', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          log.info('list query=> ' + JSON.stringify(req.query));
          const hospitalId = req.query.hospitalId;
          const usertypeId = req.query.usertypeId;
          const userInclude = [{model: db.userinfoes, attributes: excludeColumn}];
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          let whereClouse;
          if (usertypeId) {
            if (usertypeId > 0) {
              whereClouse = {hospitalId: hospitalId, usertypeId: usertypeId};
            } else {
              whereClouse = {hospitalId: hospitalId};
            }
          } else {
            whereClouse = {hospitalId: hospitalId};
          }
          const users = await User.findAll({offset: startAt, limit: limit, attributes: excludeColumn, include: userInclude, where: whereClouse});
          const count = users.length;
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(users));
          const result = [];
          users.forEach((user, i) => {
            let tempUser = {hospitalId: user.hospitalId, userId: user.id, username: user.username, typeId: user.usertypeId, StatusId: user.userstatusId};
            if (user.userinfo) {
              tempUser.infoId = user.userinfo.id,
              tempUser.NameEN = user.userinfo.User_NameEN;
              tempUser.LastNameEN = user.userinfo.User_LastNameEN;
              tempUser.NameTH = user.userinfo.User_NameTH;
              tempUser.LastNameTH = user.userinfo.User_LastNameTH;
              tempUser.Email = user.userinfo.User_Email;
              tempUser.Phone = user.userinfo.User_Phone;
              tempUser.LineID = user.userinfo.User_LineID;
              tempUser.Hospitals = user.userinfo.User_Hospitals;
            }
            result.push(tempUser);
          });
          //log.info('Final Result=> ' + JSON.stringify(result));
          res.json({Result: "OK", Records: result, TotalRecordCount: count});
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

//add api
app.post('/add', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          let newUsername = req.body.username;
          auth.doExistUser(newUsername).then(async (users) => {
            if (users.length === 0) {
              let hospitalId = req.body.hospitalId;
              try {
                auth.doGetHospitalFromId(hospitalId).then((hospitals) => {
                  let usertypeId = req.body.usertypeId;
                  auth.doGetUsertypeById(usertypeId).then((usertypes) => {
                    auth.doGetUserstatusActive().then(async (userstatuses) => {
                      let newUserinfo = {
                        User_NameEN: req.body.User_NameEN,
                        User_LastNameEN: req.body.User_LastNameEN,
                        User_NameTH: req.body.User_NameTH,
                        User_LastNameTH: req.body.User_LastNameTH,
                        User_Email: req.body.User_Email,
                        User_Phone: req.body.User_Phone,
                        User_LineID: req.body.User_LineID,
                        User_Hospitals: req.body.User_Hospitals,
                        User_PathRadiant: req.body.User_PathRadiant
                      };
                      let adUserinfo = await db.userinfoes.create(newUserinfo);
                      log.info('adUserinfo => ' + JSON.stringify(adUserinfo));
                      let newUser = {username: req.body.username, password: req.body.password};
                      let adUser = await db.users.create(newUser);
                      log.info('adUser => ' + JSON.stringify(adUser));
                      adUser.setHospital(hospitals[0]);
                      adUser.setUsertype(usertypes[0]);
                      adUser.setUserstatus(userstatuses[0]);
                      adUser.setUserinfo(adUserinfo);
                      const yourToken = auth.doEncodeToken(newUsername);
                      res.json({status: {code: 200}, token: yourToken });
                    });
                  });
                });
              } catch(error) {
                log.error(error);
                res.json({status: {code: 500}, error: error});
              }
            } else {
              res.json({status: {code: 200}, error: {why: 'your username is duplicate on DB'}});
            }
          });
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

//update api
app.post('/update', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let userId, infoId;
        try {
          let updateUser = req.body;
          userId = updateUser.userId;
          infoId = updateUser.infoId;
          await db.userinfoes.update(updateUser, { where: { id: infoId } });
          await db.users.update({usertypeId: updateUser.usertypeId}, { where: { id: userId } });
          res.json({Result: "OK"});
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

//delete api
app.post('/delete', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        let userId, infoId;
        try {
          let deleteUser = req.body;
          userId = deleteUser.userId;
          infoId = deleteUser.infoId;
          await db.userinfoes.destroy({ where: { id: infoId } });
          await db.users.destroy({ where: { id: userId } });
          res.json({Result: "OK"});
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
  User = db.users;
  return app;
}
