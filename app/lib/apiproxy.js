/* apiproxy.js */
//require('dotenv').config();
const fs = require('fs');
const util = require("util");
const path = require('path');
const url = require('url');
const request = require('request-promise');
const express = require('express');
const app = express();

const rootApi = '../api';

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

const API_NAME_LIST = ["chk_login",
						"logout",
						"get_dr_list",
						"get_case_list",
						"get_dr_work_schedule",
						"get_hospital_detail",
						"get_urgent",
						"update_urgent",
						"get_new_case_info",
						"save_new_inc",
						"get_upload_list",
						"get_case_info",
						"save_update_inc",
						"update_incident"];

app.get('/callapi', function(req, res) {
	res.status(200).send(req.query);
});

app.post('/callapi', async function(req, res) {
	let callApiName = req.body.apiname;
	let apiFound = await API_NAME_LIST.find((item) => {
		return item == callApiName;
	})
	if (apiFound) {
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
	} else {
		console.log('error: api out of bound.');
		res.status(500).send({status: 500, error: 'api out of bound.'});
	}
})

app.post('/getresource', function(req, res) {
	let rqParam = {url: req.body.url, method: 'get'};
	proxyRequest(rqParam).then((response) => {
		res.status(200).send(response.res);
	});
});

module.exports = app;
