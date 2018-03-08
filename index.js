const EventEmitter = require('events').EventEmitter;
const net = require('net');

const connection = require('./connection');

const defaultServerOpts = {
	port: 6600
};

module.exports = function (cmdHandler) {
	const mpd = Object.create(new EventEmitter());

	mpd.server = net.createServer((socket) => {
		let con = connection(socket, cmdHandler);
		mpd.emit('connection', con);

		con.on('close', () => {
			mpd.emit('disconnect', con);
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
	}

	return mpd;
};
