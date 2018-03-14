const EventEmitter = require('events').EventEmitter;
const net = require('net');

const connection = require('./connection');

const defaultServerOpts = {
	port: 6600
};

module.exports = function (cmdHandler) {
	const mpd = Object.create(new EventEmitter());

	mpd.connections = [];

	mpd.server = net.createServer((socket) => {
		let con = connection(socket, cmdHandler);
		mpd.connections.push(con);
		mpd.emit('connection', con);

		con.on('close', () => {
			mpd.emit('disconnect', con);

			let i = mpd.connections.indexOf(con);
			if(i != -1) {
				mpd.connections.splice(i, 1);
			}
		});

		con.on('error', err => {
			mpd.emit('error', err, con);
		});
	}).on('error', (err) => {
		mpd.emit('error', err);
	});

	mpd.listen = function(options, cb) {
		if (typeof options === 'function') {
			cb = options;
			options = undefined;
		}

		options = options || defaultServerOpts;

		//https://nodejs.org/api/net.html#net_server_listen_options_callback
		mpd.server.listen(options, cb);
	};

	mpd.systemUpdate = function(subSystem) {
		// send updates to connections
		for (let c of mpd.connections) {
			c.systemUpdate(subSystem);
		}
	};

	return mpd;
};
