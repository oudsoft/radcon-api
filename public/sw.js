//importScripts('lab/web-werker/workerFakeDOM.js'); 
self.addEventListener("install", () => {
	self.skipWaiting();
});
self.addEventListener("activate", () => {
	self.clients.claim()
});

self.addEventListener('push', event => {
	const data = event.data.json();
	console.log(JSON.stringify(data));
	const promiseChain = self.registration.showNotification(data.msg, {
		body: data.title,
		icon: 'img/icon/callcenter.png',
		vibrate: [200, 100, 200, 100, 200, 100, 200],
		sound: "STILLLOVINGYOU.mp3",
		/* requireInteraction: true*/
		data: {
			dateOfArrival: Date.now(),
			primaryKey: 1
		},
		actions: [
			{action: 'explore', title: 'Explore this new world',
				icon: '/assets/images/bigbears.png'},
			{action: 'close', title: 'Close notification',
				icon: '/assets/images/bigbears.png'},
		]
	});
	event.waitUntil(promiseChain);
});
self.addEventListener('notificationclick', function (event) {
	console.log(event);
	console.log(event.notification);
	event.notification.close();
});