const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const exec = require('child_process').exec;

var log;

const proxyRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		log.info('rqParam=>', rqParam);
		let rqBody = JSON.stringify(rqParam.body);
		log.info('rqBody=>', rqBody);
		request({
			/* json: true, */
			method: rqParam.method,
			url: rqParam.uri,
			auth: rqParam.auth,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': rqParam.Authorization
			},
			body: rqBody
		}, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				console.log(JSON.stringify(err));
				reject({status: {code: 500}, err: err});
			}
		});
	});
}

const runcommand = function (command) {
	return new Promise(function(resolve, reject) {
		logger().info(new Date()  + " Command " + command);
		exec(command, (error, stdout, stderr) => {
			if(error === null) {
				//logger().info(new Date()  + " Resolve " + `${stdout}`);
				resolve(`${stdout}`);
			} else {
				logger().error(new Date()  + " Reject " + `${stderr}`);
				reject(`${stderr}`);
			}
        });
	});
}

const parseStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

module.exports = (monitor) => {
	log = monitor;
  return {
    proxyRequest,
    runcommand,
    parseStr
  }
}
