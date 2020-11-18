/*
 * Copyright (C) 2017 Jason Henderson
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE file for details.
 */

const log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';

log.info('inside child express process...');

/**
 * Module dependencies.
 */
require('dotenv').config();
const os = require('os');
const fs = require('fs');

const express = require('express');
const mainApp = express();

const debug = require('debug')('config:server');
const https = require('https');
const privateKey = fs.readFileSync(__dirname + '/key.pem', 'utf8');
const certificate = fs.readFileSync(__dirname + '/key.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

let httpsServer = null;
let webSocketServer = null;

/**
 * Get port from environment and store in Express.
 */

// Port 4332 is currently unassigned and not widely used
// We will use it as a default HTTP channel
log.info('process.env.SERVER_PORT => ' + process.env.SERVER_PORT);
var port = normalizePort(process.env.SERVER_PORT || '3000');
mainApp.set('port', port);
mainApp.use('/', express.static(__dirname + '/../public'));
/**
 * Create HTTP server.
 */

//doGetAllRootApp().then((rootUri) => {
  httpsServer = https.createServer(credentials, mainApp/* , reqListener */);
	webSocketServer = require(__dirname + '/../app/lib/websocket.js')(httpsServer, log);
  const {api, db} = require(__dirname + '/../app/api.js')(webSocketServer, log);
  const app = require(__dirname + '/../app/app.js')(webSocketServer, log);
  mainApp.use('/api', api);
  mainApp.use('/app', app);
  /*
  log.info('hosted=>' + JSON.stringify(rootUri));
  rootUri.forEach((item)=>{
    log.info(item.Hos_RootPathUri);
    mainApp.use('/' + item.Hos_RootPathUri + '/api', api);
    mainApp.use('/' + item.Hos_RootPathUri + '/app', app);
  });
  */

  const login = require(__dirname + '/../app/db/rest/login.js')(db, log);
  const uploader = require(__dirname + '/../app/lib/uploader.js')(mainApp);
  mainApp.use('/api/login', login);

  //const util = require(__dirname + '/../app/lib/mod/util.js')(log);
  //mainApp.use('/app', app);
  mainApp.get('/', (req, res) => {
    const hostname = req.headers.host;
  	const rootname = req.originalUrl.split('/')[1];
    log.info('hostname = ' + hostname);
    log.info('rootname = ' + rootname);
    log.info('METHODE = ' + req.method);
  })
  /**
   * Listen on provided port, on all network interfaces.
   */

  httpsServer.listen(port);
  httpsServer.on('error', onError);
  httpsServer.on('listening', onListening);
//})
/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    	case 'EACCES':
     	  log.error(bind + ' requires elevated privileges');
     	  process.exit(1);
      break;
    	case 'EADDRINUSE':
     	  log.error(bind + ' is already in use');
      	process.exit(1);
      break;
    	default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = httpsServer.address();
  var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/*
Call all hospital rootUri
*/
function doGetAllRootApp() {
	return new Promise(function(resolve, reject) {
		const pool = require('../app/db/dbpool.js').getPool();
		//let hoses = await tempDB.hospitals.findAll({ attributes: ['id', 'Hos_RootPathUri'], raw: true });
		pool.connect().then(client => {
			client.query('BEGIN');
			var sqlCmd = 'select "id", "Hos_Name", "Hos_RootPathUri" from "hospitals"';
			client.query(sqlCmd, []).then(res => {
				if (res.rowCount > 0){
					client.query('COMMIT');
					resolve(res.rows);
				} else {
					resolve({});
				}
			}).catch(err => {
				client.query('ROLLBACK');
				reject(err.stack)
			});
			client.release();
		});
	});
}

/*
Server Request Listener
*/
function reqListener(request, response) {
  const hostname = req.headers.host;
	const rootname = req.originalUrl.split('/')[1];
  log.info('hostname = ' + hostname);
  log.info('rootname = ' + rootname);
  log.info('METHODE = ' + request.method);
  if (request.method == 'POST') {
  } else if (request.method == 'PUT') {
  } else if (request.method == 'GET') {
  } else if (request.method == 'DELETE') {
  } else {
    response.writeHead(405);
  }
  response.end();
}
