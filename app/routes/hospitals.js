var log = require('electron-log');
log.transports.console.level = 'info';
log.transports.file.level = 'info';

var express = require('express');
var app = express();

// view engine setup
var path = require('path');
var viewsPath = path.join(__dirname, '../', 'views');
app.set('views', viewsPath);
app.set('view engine', 'ejs');

/* GET home page. */
app.get('/', function(req, res) {
    log.info('serving hospital items page...');
    res.render('hospitals', { title: 'Rad Connext', hospitals: [] });
});

module.exports = () => {
  return app;
}
