const EventEmitter = require('events').EventEmitter;
const net = require('net');

const MPD_OK = 'OK MPD 0.20.18';
const MPD_SENTINEL = /^.+$/m;

const defaultServerOpts = {
	port: 6600
};

module.exports = function (cmdHandler) {
	const mpd = Object.create(new EventEmitter());

	function executeCommandBuffer(socket, buffer, listOk) {
		//TODO implement the idle and no idle here

		// execute all commands in the command buffer
		return buffer.reduce((p, command, i) => p.then(() => {
			let args = command.match(/(?:[^\s"]+|"([^"]*)")+/);

			return cmdHandler(args[0], args.slice(1)).then((resp) => {
				socket.write(resp);
				if (listOk) {
					socket.write('list_OK\n');
				}
			}).catch((err) => {
				// the command has failed
				// return the command status according to the response syntax
				// https://www.musicpd.org/doc/protocol/response_syntax.html
				// https://github.com/MusicPlayerDaemon/MPD/blob/master/src/protocol/Ack.hxx
				// as error code we'll allways use ACK_ERROR_UNKNOWN (5)
				let errorCode = 5;
				let resp = `ACK [${errorCode}@${i}] {${command}} ${err}\n`;
				throw resp
			});
		}), Promise.resolve()).then(() => {
			socket.write('OK\n');
		}).catch((err) => {
			socket.write(err);
		});
	}

	mpd.server = net.createServer((socket) => {
		// client buffer values
		let msgBuffer = '';
		let cmdBuffer = undefined;
		let listOk = false;
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
						listOk = true;
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
					executeCommandBuffer(socket, cmdBuffer, listOk);
					cmdBuffer = undefined;
					listOk = false;
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
