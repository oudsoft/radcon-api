/* apiproxy.js */
//require('dotenv').config();
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const express = require('express');
const app = express();

const proxyRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		//console.log(rqParam);
		request({
			method: rqParam.method,
			url: rqParam.url,
			body: JSON.stringify(rqParam.body)
		}, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				reject({status: {code: 500}, err: err});
			}
		});
	});
}

const proxyZoomRequest = function(rqParam) {
	return new Promise(function(resolve, reject) {
		request({
			method: rqParam.method,
			url: rqParam.url,
			body: rqParam.body,
			json: true
		}, (err, res, body) => {
			if (!err) {
				resolve({status: {code: 200}, res: res});
			} else {
				reject({status: {code: 500}, err: err});
			}
		});
	});
}

var db, log;

app.post('/callapi', async function(req, res) {
	let rqParam = {url: req.body.url, method: req.body.method, body: req.body.body};
	proxyRequest(rqParam).then((response) => {
		console.log('call success');
		//console.log(response);
		res.status(200).send(response);
	}).catch ((err) => {
		console.log('call error');
		//console.log(err);
		res.status(500).send(err);
	})
})

app.post('/callzoomapi', async function(req, res) {
	let rqParam = {url: req.body.url, method: req.body.method, body: req.body.body};
	proxyZoomRequest(rqParam).then((response) => {
		console.log('call success');
		//console.log(response);
		res.status(200).send(response);
	}).catch ((err) => {
		console.log('call error');
		//console.log(err);
		res.status(500).send(err);
	})
})

module.exports = ( dbcon, monitor ) => {
  db = dbcon;
  log = monitor;
	return app;
}
