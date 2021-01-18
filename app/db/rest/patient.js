const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

var db, Patient, log, auth;

const excludeColumn = { exclude: ['updatedAt', 'createdAt'] };

const doSearchByKey = function(key) {
  return new Promise(async (resolve, reject) => {
    const patient = await Patient.findAll({ attributes: excludeColumn, where: key });
    resolve(patient);
  });
}

const doCreateFullNameEN = function(patientId){
  return new Promise(async (resolve, reject) => {
    const patient = await Patient.findAll({ attributes: ['Patient_NameEN', 'Patient_LastNameEN'], where: {id: patientId} });
    resolve(patient);
  });
}

//Search API
app.post('/search', (req,res) => {
  let keyPair = req.body.key;
  doSearchByKey(keyPair).then((result) => {
    res.json({Result: "OK", Records: result});
  });
})

//fullname en api
app.post('/fullname/en/(:patientId)', (req, res) => {
  let patientId = req.params.patientId;
  doCreateFullNameEN(patientId).then((patientRecords) => {
    let patientRec = patientRecords[0];
    let fullNameEN = patientRec.Patient_NameEN + ' ' + patientRec.Patient_LastNameEN;
    res.json({status: {code: 200}, fullNameEN: fullNameEN});
  })
});

//List API
app.post('/list/hospital/(:hospitalId)', (req, res) => {
  let token = req.headers.authorization;
  if (token) {
    auth.doDecodeToken(token).then(async (ur) => {
      if (ur.length > 0){
        try {
          const hospitalId = req.params.hospitalId;
          const limit = req.query.jtPageSize;
          const startAt = req.query.jtStartIndex;
          const count = await Patient.count();
          const types = await Patient.findAll({offset: startAt, limit: limit, attributes: excludeColumn, where: {hospitalId: hospitalId}});
          //res.json({status: {code: 200}, types: types});
          //log.info('Result=> ' + JSON.stringify(types));
          res.json({Result: "OK", Records: types, TotalRecordCount: count});
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
          let newPatient = req.body.data;
          let adPatient = await Patient.create(newPatient);
          await Patient.update({hospitalId: req.body.hospitalId},{where: {id: adPatient.id}});
          res.json({Result: "OK", Record: adPatient});
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
        try {
          const id = req.body.id;
          let updatePatient = req.body.data;
          await Patient.update(updatePatient, { where: { id: req.body.patientId } });
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
        try {
          const id = req.body.id;
          await Patient.destroy({ where: { id: id } });
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
  Patient = db.patients;
  return app;
}
