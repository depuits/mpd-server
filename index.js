const EventEmitter = require('events').EventEmitter;
const net = require('net');

const MPD_OK = 'OK MPD 0.20.18';
const MPD_SENTINEL = /^.+$/m;

const defaultServerOpts = {
	port: 6600
};

module.exports = function (cmdHandler) {
	const mpd = Object.create(new EventEmitter());

	function executeCommandBuffer(buffer, singleCommandCallback) {
		// execute all commands in the command buffer
		for (let i = 0; i < buffer.length; ++i) {
			//TODO split command and parameters
			let command = buffer[i];
			let args = command.match(/(?:[^\s"]+|"([^"]*)")+/);

			if (cmdHandler('TODO add command details')) {
				if (typeof singleCommandCallback === 'function') {
					singleCommandCallback();
				}
			} else {
				// the command has failed
				// return the command status according to the response syntax
				// https://www.musicpd.org/doc/protocol/response_syntax.html
				// https://github.com/MusicPlayerDaemon/MPD/blob/master/src/protocol/Ack.hxx
				// as error code we'll allways use ACK_ERROR_UNKNOWN (5)
				let errorCode = 5;
				return `ACK [${errorCode}@${i}] {${command}} some (hopefully) informative text that describes the nature of the error.`;
			}
		}

		return 'OK';
	}

	mpd.server = net.createServer((socket) => {
		// client buffer values
		let msgBuffer = '';
		let cmdBuffer = undefined;
		let listOkFn = undefined;
		let execute = false;

		socket.write(MPD_OK);
		mpd.emit('connection', socket);

		socket.on('close', () => {
			mpd.emit('disconnect', socket);
		});

		socket.on('data', (data) => {
			msgBuffer += data;
			let match;
			while (match = msgBuffer.match(MPD_SENTINEL)) {
				let msg = match[0];
				let resp = undefined;

				switch (msg) {
					case 'command_list_ok_begin':
						listOkFn = () => {
							 socket.write('list_OK');
						};
					case 'command_list_begin':
						cmdBuffer = [];
						break;
					case 'command_list_end':
						// execute the command buffer at the end of the list
						execute = true;
						break;
					default:
						if (!cmdBuffer) {
							// create buffer and let it execute
							cmdBuffer = [];
							execute = true;
						}
						cmdBuffer.push(msg);
				}

				if (execute) {
					let resp = executeCommandBuffer(cmdBuffer, listOkFn);
					socket.write(resp + '\n');
					cmdBuffer = undefined;
					listOkFn = undefined;
					execute = false;
				}

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
