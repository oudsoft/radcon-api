const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';

const db = require('./relation.js');

const auth = require('./rest/auth.js')(db, log);

auth.resetAdmin('test0001', 'test0001');
auth.resetAdmin('test0003', 'test0003');
auth.resetAdmin('test0004', 'test0004');
