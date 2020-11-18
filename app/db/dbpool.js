//dbpool.js
require('dotenv').config();
var pg = require('pg');
var pool;

var config = {
		user: process.env.DB_USERNAME,
		host: process.env.DB_SERVER_DOMAIN,
		database: process.env.DB_NAME,
		password: process.env.DB_PASSWORD,
		port: process.env.DB_SERVER_PORT,
};

module.exports = {
    getPool: function () {
		if (pool) return pool; // if it is already there, grab it here
		pool = new pg.Pool(config);
		return pool;
	}
}
