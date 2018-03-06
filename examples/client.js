var mpd = require('mpd'),
	cmd = mpd.cmd;

var client = mpd.connect({
	port: 6600,
	host: 'localhost',
});

client.on('ready', function() {
	console.log("ready");
});

client.on('system', function(name) {
	console.log("update", name);
});

client.on('system-player', function() {
	client.sendCommand(cmd("status", []), function(err, msg) {
		if (err) throw err;
		console.log(msg);
	});
});

setTimeout(() => {
	client.sendCommand(cmd("play", []), function(err, msg) {
		console.log("send play");
	});
}, 5000);