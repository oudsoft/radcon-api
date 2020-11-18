/* notification.js */

const publicVapidKey = 'BLR1KlwGuN0G6p9dGk7dAXXQyntqZzZO0LKcPsh2MNsd79DBcOAR4EDHuJdXHUC1rHhfSRtLXAIXO7N0OioNUjg';
const privateVapidKey = '58J6voJuyaaZCePGauRKqFmsHIOu-2JTMrpXgFBb2Ks';

const webPush = require('web-push');
webPush.setVapidDetails('mailto:test@example.com', publicVapidKey, privateVapidKey);

const subscribers = [];

module.exports = function (app) {
	app.get('/subscribe', (req, res) => {
		console.log(JSON.stringify(req.body)); // => {"endpoint":"https://fcm.googleapis.com/fcm/send/e8eoejqPMQ8:APA91bFifgREW-rZIfeiq0LA-vcPhcAzzcg6JPzoDIo5-xttjs6XbBRJanHkZnlOkd9_86Ew6xM3YXwARRz974H2ecuB72LZ74LdcrNd2LeqZ6po_H_2xWc7ENzq3TNVaY_ykjYbY_5J","expirationTime":null,"keys":{"p256dh":"BH1-84jK4GWmI5BGzgkjeFH53zOEdfD4fksYcmJYwfsjYVEZPpazsjenfFcc6u9DaxhXQD2K77Of3yKfKwcbNxQ","auth":"6a6P9keTMY794bH0PIOzxA"}}
	});

	app.post('/subscribe', (req, res) => {
		//console.log('req.body: ' + JSON.stringify(req.body)); // => {"endpoint":"https://fcm.googleapis.com/fcm/send/e8eoejqPMQ8:APA91bFifgREW-rZIfeiq0LA-vcPhcAzzcg6JPzoDIo5-xttjs6XbBRJanHkZnlOkd9_86Ew6xM3YXwARRz974H2ecuB72LZ74LdcrNd2LeqZ6po_H_2xWc7ENzq3TNVaY_ykjYbY_5J","expirationTime":null,"keys":{"p256dh":"BH1-84jK4GWmI5BGzgkjeFH53zOEdfD4fksYcmJYwfsjYVEZPpazsjenfFcc6u9DaxhXQD2K77Of3yKfKwcbNxQ","auth":"6a6P9keTMY794bH0PIOzxA"}}
		//console.log(req.body);
		//console.log(req.body.subscription);
		const subscription = JSON.parse(req.body.subscription);
		let msg = req.body.msg;
		let title = req.body.title;
		res.status(201).json({});

		const payload = JSON.stringify({
			msg: msg,
			title: title,
		});

		webPush.sendNotification(subscription, payload).catch(error => console.error(error));

		var finders = subscribers.filter((item) => {
			if (item.endpoint === subscription.endpoint) {
				return item;
			}
		});
		if (finders.length == 0) {
			subscribers.push(subscription);
		}
	});

	app.post('/messages', (req, res) => {
		//console.log('req.body.subscription: ' + JSON.stringify(req.body.subscription));
		const subscription = JSON.parse(req.body.subscription);
		//console.log('parse subscription: ', subscription);
		let username = req.body.username;
		let msg = req.body.msg;
		let title = req.body.title;
		res.status(201).json({});

		const payload = JSON.stringify({
			title: title,
			username: username,
			msg: msg
		});

		console.log('subscribers: ', subscribers);

		subscribers.forEach((item) => {
			//webPush.sendNotification(subscription, payload).catch(error => console.error(error));
			webPush.sendNotification(item, payload).catch(error => console.error(error));
		});
	});

}