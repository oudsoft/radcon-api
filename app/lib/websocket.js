/* websocket.js */

function RadconWebSocketServer (arg, log) {
	const $this = this;
	this.httpsServer = arg;
	const WebSocketServer = require('ws').Server;
	const wss = new WebSocketServer({server: this.httpsServer/*, path: '/' + roomname */});
	this.socket = wss;
	this.clients = [];

	wss.on('connection', async function (ws, req) {
		$this.clients.push(ws);
		log.info(ws._socket.remoteAddress);
		log.info(ws._socket._peername);
		log.info(req.connection.remoteAddress);
		log.info(`WS Conn Url : ${req.url} Connected.`);
		let fullReqPaths = req.url.split('?');
		let wssPath = fullReqPaths[0];
		let wssQuery = fullReqPaths[1];
		log.info(wssPath);
		//wssPath = wssPath.substring(1);
		wssPath = wssPath.split('/');
		log.info(wssPath);
		ws.id = wssPath[(wssPath.length -2)];
		ws.hospitalId = wssPath[(wssPath.length -1)];
		let connectType;
		if (wssQuery) {
			let queries = wssQuery.split('&');
			connectType = queries[0].split('=');
			ws.connectType = connectType[1];
		}

		ws.send(JSON.stringify({type: 'test', message: ws.id + ', You have Connected master websocket success.'}));

		ws.on('message', async function (message) {
			var data;

			//accepting only JSON messages
			try {
				data = JSON.parse(message);
			} catch (e) {
				log.info("Invalid JSON of Socket data.");
				data = {};
			}

			log.info('socket data => ' + JSON.stringify(data));
			let hospitalId, owner;
			if (data.type) {
				switch (data.type) {
					case "trigger":
						let command = 'curl -X POST --user demo:demo http://localhost:8042/tools/execute-script -d "doLocalStore(\'' + data.dcmname + '\')"';
						$this.runCommand(command).then((result) => {
							ws.send(JSON.stringify({type: 'result', message: result}));
						});
          break;
					case "notify":
						if (data.sendto === ws.id) {
							ws.send(JSON.stringify({type: 'notify', message: data.notify}));
						}
					break;
					case "exec":
						if (data.data) {
							hospitalId = data.data.hospitalId;
							let localSocket = await $this.findHospitalLocalSocket(hospitalId);
							if (localSocket) {
								if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
									localSocket.send(JSON.stringify(data));
								} else {
									ws.send(JSON.stringify({type: 'notify', message: 'Local Socket is not on readyState!!'}));
								}
							} else {
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
							}
						}
					break;
					case "cfindresult":
						owner = data.owner;
						hospitalId = data.hospitalId;
						let cfindResult = {type: "cfindresult", result: data.data, hospitalId: hospitalId, owner: owner};
						$this.sendMessage(cfindResult, owner);
					break;
					case "move":
						if (data.data) {
							hospitalId = data.data.hospitalId;
							let localSocket = await $this.findHospitalLocalSocket(hospitalId);
							if (localSocket) {
								if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
									localSocket.send(JSON.stringify(data));
								} else {
									ws.send(JSON.stringify({type: 'notify', message: 'Local Socket is not on readyState!!'}));
								}
							} else {
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
							}
						}
					break;
					case "cmoveresult":
						owner = data.owner;
						let studyInstanceUID = data.StudyInstanceUID;
						let cmoveResult = {type: "cmoveresult", result: data.data, StudyInstanceUID: studyInstanceUID, owner: owner};
						$this.sendMessage(cmoveResult, owner);
					break;
					case "run":
						if (data.data) {
							hospitalId = data.data.hospitalId;
							let localSocket = await $this.findHospitalLocalSocket(hospitalId);
							if (localSocket) {
								if ((localSocket.readyState == 0) || (localSocket.readyState == 1)) {
									localSocket.send(JSON.stringify(data));
								} else {
									ws.send(JSON.stringify({type: 'notify', message: 'Local Socket is not on readyState!!'}));
								}
							} else {
								ws.send(JSON.stringify({type: 'notify', message: 'Local Socket have not Connected!!'}));
							}
						}
					break;
					case "runresult":
						owner = data.owner;
						let runResult = {type: "runresult", result: data.data, owner: owner};
						$this.sendMessage(runResult, owner);
					break;
				}
			} else {
				ws.send(JSON.stringify({type: 'error', message: 'Your command invalid type.'}));
			}
		});

		ws.isAlive = true;

		ws.on('pong', () => {
			//log.info(ws.id + ' => On Pong have state => ' + ws.readyState);
			ws.isAlive = true;
		});

		ws.on('close', function(ws, req) {
			//log.info(`WS Conn Url : ${req.url} Close.`);
			log.info(`WS Conn Url : ${ws.id} Close.`);
		});

	});

	setInterval(() => {
		wss.clients.forEach((ws) => {
			if (!ws.isAlive) return ws.terminate();
			//ws.isAlive = false;
			//log.info(ws.id +' => Start Ping have state => ' + ws.readyState);
			ws.ping(null, false, true);
		});
	}, 85000);

	this.findUserSocket = function(username) {
		return new Promise(function(resolve, reject) {
			let yourSocket = $this.clients.find((ws) =>{
				if ((ws.id == username) && ((ws.readyState == 0) || (ws.readyState == 1))) return ws;
			});
			resolve(yourSocket);
		});
	}

	this.findHospitalLocalSocket = function(hospitalId) {
		return new Promise(function(resolve, reject) {
			let yourSocket = $this.clients.find((ws) =>{
				if ((ws.hospitalId == hospitalId) && (ws.connectType === 'local') && ((ws.readyState == 0) || (ws.readyState == 1))) return ws;
			});
			resolve(yourSocket);
		});
	}

	this.sendMessage = async function(message, sendto) {
		let userSocket = await $this.findUserSocket(sendto);
		if (userSocket) {
			userSocket.send(JSON.stringify(message));
			return true;
		} else {
			return false;
		}
	}

	this.runCommand = function (command) {
		return new Promise(function(resolve, reject) {
			const exec = require('child_process').exec;
			exec(command, (error, stdout, stderr) => {
				if(error === null) {
					resolve(`${stdout}`);
				} else {
					reject(`${stderr}`);
				}
	    });
		});
	}

}

module.exports = ( arg, monitor ) => {
	const webSocketServer = new RadconWebSocketServer(arg, monitor);
	return webSocketServer;
}
