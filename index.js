const EventEmitter = require('events').EventEmitter;
const net = require('net');

const MPD_OK = 'OK MPD 0.12.2';
const MPD_SENTINEL = /^.*$/m;

const defaultServerOpts = {
	port: 6600
};

module.exports = function (cmdHandler) {
	const mpd = Object.create(new EventEmitter());

	function executeCommandBuffer(buffer, singleCommandCallback) {
		//TODO execute all commands in the command buffer

		//split command and parameters
		cmdHandler('TODO add command details');
		// return the command status according to the response syntax
		// https://www.musicpd.org/doc/protocol/response_syntax.html
	}

	mpd.server = net.createServer((socket) => {
		// client buffer values
		let msgBuffer = '';
		let cmdBuffer = undefined;

		socket.write(MPD_OK);
		mpd.emit('connection', socket);

		socket.on('close', () => {
			mpd.emit('disconnect', socket);
		});

		socket.on('data', (data) => {
			msgBuffer += data;
			while (let match = msgBuffer.match(MPD_SENTINEL)) {
				let msg = msgBuffer.substring(0, match.index);

				//TODO build command buffer
				//command_list_begin || command_list_ok_begin (list_OK)
				// command_list_end
				executeCommandBuffer();

				msgBuffer = msgBuffer.substring(msg.length + 1);
			}
		});

		socket.on('error', err => {
			mpd.emit('error', err, socket);
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
