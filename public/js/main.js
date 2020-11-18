

function doConnectWebsocketLocal(username) {
	const hostname = window.location.hostname;
  const port = window.location.port;
  const paths = window.location.pathname.split('/');
  const rootname = paths[1];
  let wsUrl = 'wss://' + hostname + ':' + port + '/' + rootname + '/' + username + '?type=test';
  console.log(wsUrl);
  ws = new WebSocket(wsUrl);
	ws.onopen = function () {
		console.log('Websocket is connected to the signaling server')
	};

	ws.onmessage = function (msgEvt) {
    let data = JSON.parse(msgEvt.data);
    console.log(data);
    if (data.type == 'test') {
      $.notify(data.message, "success");
    } else if (data.type == 'trigger') {
      $.notify(data.message, "success");
    } else if (data.type == 'notify') {
      $.notify(data.message, "warnning");
    }
	};

  ws.onclose = function(event) {
		console.log("WebSocket is closed now. with  event:=> ", event);
	};

	ws.onerror = function (err) {
	   console.log("WS Got error", err);
	};
}

doConnectWebsocketLocal('admin');
