require('dotenv').config();
const Sequelize = require('sequelize');
const crypto = require('crypto')
const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';

const dburl = 'postgres://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_SERVER_DOMAIN + ':' + process.env.DB_SERVER_PORT + '/' + process.env.DB_NAME;
log.info(dburl);
const sequelize = new Sequelize(dburl, {
  /* operatorsAliases: false, */
  //logging: log.info
  logging: true
});

const Op = Sequelize.Op;

sequelize.authenticate().then(() => {
	log.info('Connection has been established successfully.');
}).catch(err => {
	log.error('Unable to connect to the database:', err);
});

const Def = require('./model/model-def.js');

const hospitals = sequelize.define('hospitals',  Def.RadHospitalDef);

const usertypes = sequelize.define('usertypes', Def.RadUserTypeDef);

const userstatuses = sequelize.define('userstatuses', Def.RadUserStatusDef);

const users = sequelize.define('users', Def.RadUserDef);

users.generateSalt = function() {
  return crypto.randomBytes(16).toString('base64')
}
users.encryptPassword = function(plainText, salt) {
  return crypto
    .createHash('RSA-SHA256')
    .update(plainText)
    .update(salt)
    .digest('hex')
}
const setSaltAndPassword = user => {
  if (user.changed('password')) {
    user.salt = users.generateSalt()
    user.password = users.encryptPassword(user.password(), user.salt())
  }
}
users.beforeCreate(setSaltAndPassword)
users.beforeUpdate(setSaltAndPassword)
users.prototype.correctPassword = function(enteredPassword) {
  const encryptYourPassword = users.encryptPassword(enteredPassword, this.salt());
  /*
  log.info('this password => ' + this.password())
  log.info('enteredPassword=>' + enteredPassword);
  log.info('encryptYourPassword=>' + encryptYourPassword);
  */
  return  encryptYourPassword === this.password()
}

const userinfoes = sequelize.define('userinfoes', Def.RadUserInfoDef);
users.belongsTo(hospitals);
users.belongsTo(usertypes);
users.belongsTo(userstatuses);
users.belongsTo(userinfoes);

const orthancs = sequelize.define('orthancs', Def.RadOrthancDef);
orthancs.belongsTo(hospitals);

const urgenttypes = sequelize.define('urgenttypes', Def.RadUrgentTypeDef);
urgenttypes.belongsTo(hospitals);

const generalstatuses = sequelize.define('generalstatuses', Def.RadGeneralStatusDef);
const cliamerights = sequelize.define('cliamerights', Def.RadCliameRightsDef);

const casestatuses = sequelize.define('casestatuses', Def.RadCaseStatusDef);
casestatuses.belongsTo(generalstatuses);

const patients = sequelize.define('patients', Def.RadPatientDef);
patients.belongsTo(hospitals);

const dicomtransferlogs = sequelize.define('dicomtransferlogs', Def.RadDicomTransferLogDef);
dicomtransferlogs.belongsTo(orthancs);

const hospitalreports = sequelize.define('hospitalreports', Def.RadHospitalReportDef);
hospitalreports.belongsTo(hospitals);

const workinghours = sequelize.define('workinghours', Def.RadWorkingHourDef);
workinghours.belongsTo(hospitals);

const workingschedules = sequelize.define('workingschedules', Def.RadWorkingScheduleDef);
workingschedules.belongsTo(hospitals);
workingschedules.belongsTo(users);

const templates = sequelize.define('templates', Def.RadTemplateDef);
templates.belongsTo(users);

const cases = sequelize.define('cases', Def.RadCaseDef);
cases.belongsTo(hospitals);
cases.belongsTo(patients);
cases.belongsTo(urgenttypes);
cases.belongsTo(cliamerights);
cases.belongsTo(casestatuses);
cases.belongsTo(users);

const caseresponses = sequelize.define('caseresponses', Def.RadCaseResponseDef);
caseresponses.belongsTo(cases);
caseresponses.belongsTo(users);

const casereports = sequelize.define('casereports', Def.RadCaseReportDef);
casereports.belongsTo(users);
casereports.belongsTo(cases);


module.exports =  {
  sequelize,
  Op,
  Def,
  hospitals,
  usertypes,
  userstatuses,
  users,
  userinfoes,
  orthancs,
  urgenttypes,
  generalstatuses,
  cliamerights,
  casestatuses,
  patients,
  dicomtransferlogs,
  hospitalreports,
  workinghours,
  workingschedules,
  templates,
  cases,
  caseresponses,
  casereports
}
