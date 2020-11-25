const bodyParser = require('body-parser');
const express = require('express');
const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

const crypto = require('crypto') // crypto comes with Node.js
const request = require('request-promise');
const jwt = require('jsonwebtoken');

const zoomApiHeader = { "alg": "HS256", "typ": "JWT" };
const zoomApiPayload = function() {
  return {
    "iss": process.env.ZOOM_API_KEY,
    "exp": nextExpired()
  }
}
const zoomApiSignature = function(){
  let header = zoomApiHeader;
  let payload = zoomApiPayload();
  let msg = JSON.stringify(header) + '.' + JSON.stringify(payload);
  let hash = crypto.createHmac('sha256', process.env.ZOOM_API_SECRET).update(msg).digest('base64');
  return hash;
}
const zoomApiJWTToken = function(){
  let payload = zoomApiPayload();
  return jwt.sign(payload, process.env.ZOOM_API_SECRET);
}

var db, log, auth;

function generateSignature(apiKey, apiSecret, meetingNumber, role) {

  // Prevent time sync issue between client signature generation and zoom
  const timestamp = new Date().getTime() + 60000
  const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString('base64')
  const hash = crypto.createHmac('sha256', apiSecret).update(msg).digest('base64')
  const signature = Buffer.from(`${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64')

  return signature
}

function base64UrlEncode(yourStr) {
  var buffer = new Buffer(yourStr, 'base64')
  var encode = buffer.toString();
  return encode;
}

function nextExpired() {
  let d = new Date();
  d = d.getTime() + (1*60*1000);
  return d;
}

function requestZoomApi(url, params){
  return new Promise(function(resolve, reject) {
    let zoomToken = zoomApiJWTToken();
    let options = {
      uri: url,
      qs: {
        status: 'active' // -> uri + '?status=active'
      },
      auth: {
        //Provide your token here
        'bearer': zoomToken
      },
      headers: {
        'User-Agent': 'Zoom-Jwt-Request',
        'content-type': 'application/json'
      },
      body: params,
      json: true // Automatically parses the JSON string in the response
    };
    request(options).then(function (response) {
      resolve(response);
    }).catch(function (err) {
      reject(err)
    });
  });
}

app.post('/signature', (req, res) => {
  try {
    let meetingNumber = req.body.meetingNumber;
    let role = req.body.role;
    let yourSignature = generateSignature(process.env.ZOOM_API_KEY, process.env.ZOOM_API_SECRET, meetingNumber, role);
    let zoomToken = zoomApiJWTToken();
    res.json({status: {code: 200}, Signature: yourSignature, apiKey: process.env.ZOOM_API_KEY, zoomToken: zoomToken});
  } catch(error) {
    log.error(error);
    res.json({status: {code: 500}, error: error});
  }
});


app.post('/zoomuser', async(req, res) => {
  try {
    let zoomUrl = 'https://api.zoom.us/v2/users';
    let params = req.body.params;
    let zoomRes = await requestZoomApi(zoomUrl, params)
    res.json({status: {code: 200}, response: zoomRes});
  } catch(error) {
    log.error(error);
    res.json({status: {code: 500}, error: error});
  }
});

app.post('/meeting', async(req, res) => {
  try {
    log.info('Zoom Request =>' + JSON.stringify(req.body));
    let zoomUserId = req.body.zoomUserId;
    let zoomParams = req.body.params;
    let zoomUrl = 'https://api.zoom.us/v2/users/' + zoomUserId + '/meetings';
    let zoomRes = await requestZoomApi(zoomUrl, zoomParams);
    log.info('Zoom Response =>' + JSON.stringify(zoomRes));
    res.json({status: {code: 200}, response: zoomRes});
  } catch(error) {
    log.error(error);
    res.json({status: {code: 500}, error: error});
  }
});

module.exports = ( dbcon, monitor ) => {
  db = dbcon;
  log = monitor;
  auth = require('../db/rest/auth.js')(db, log);
	return app;
}
