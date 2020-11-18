/*
 * Copyright (C) 2017 Jason Henderson
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE file for details.
 */

var express = require('express');
var app = express();

// view engine setup
var path = require('path');
var viewsPath = path.join(__dirname, '../', 'views');
app.set('views', viewsPath);
app.set('view engine', 'ejs');

/* GET users listing. */
app.get('/', function(req, res) {
  //res.send('respond with a resource');
  console.log('test');
  res.render('users', {title: 'Rad Connext'});
});

module.exports = app;
