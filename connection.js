'use strict';

const EventEmitter = require('events').EventEmitter;

const MPD_OK = 'OK MPD 0.20.18\n';
const MPD_SENTINEL = /^.+$/m;

module.exports = function (socket, cmdHandler) {
	const con = Object.create(new EventEmitter());
	con.socket = socket;

	con.updates = [];

	// client buffer values
	let cmdChain = Promise.resolve();
	let msgBuffer = '';
	let cmdBuffer = undefined;
	let execute = false;
	let listOk = false;
	let idle = false;

	function printUpdates() {
		// combine all updates in a single response
		let print = con.updates.reduce((resp, system) => resp + `changed: ${system}\n`, '');
		// clear the current update list
		con.updates = [];
		return print;
	}

	function executeCommand(cmd, params) {
		if (cmd === 'idle') {
			//TODO handle idle arguments			
			con.emit('idle');

			if (con.updates.length > 0) {
				// there are updates waiting so we directly reply
				con.emit('noidle');
				return Promise.resolve(printUpdates());
			} else {
				// there are no updates yet so
				// we'll go into idle
				idle = true;
				return new Promise((resolve, reject) => {
					let systemListener = (system) => {
						con.removeListener('noidle', noIdleListener);
						con.emit('noidle');
						resolve(printUpdates());
					};
					let noIdleListener = () => {
						con.removeListener('system', systemListener);
						resolve(printUpdates());
					};

					// wait for event and then write change
					con.once('system', systemListener);
					// or just wait for the noidle
					con.once('noidle', noIdleListener);
				});
			}
		}

		return cmdHandler(cmd, params);
	}

	// we still pass the buffer and list ok to capture the values
	function executeCommandBuffer(buffer, listOk) {
		// execute all commands in the command buffer in the order and waiting for their response
		return buffer.reduce((p, command, i) => p.then(() => {
			let args = command.match(/\w+|"(?:\\"|[^"])+/g);
			return executeCommand(args[0], args.slice(1)).then((resp) => {
				// write the command response
				socket.write(resp);
				// and list ok if requested
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
			// when the complete buffer is executed then write the ok confirmation
			if (!listOk) {
				socket.write('OK\n');
			}
		}).catch((err) => {
			// if anything failed then write the error
			socket.write(err);
		});
	}

	socket.write(MPD_OK);
	con.emit('connection', con);

	socket.on('close', () => {
		con.emit('disconnect', con);
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
				if (cmdBuffer[0] === 'noidle') {
					//if the command buffer is 'noidle' then cancel the idling
					con.emit('noidle');
				} else {
					//otherwise chain the commands after any other commands still in execution
					let buffer = cmdBuffer;
					let lsOk = listOk;
					cmdChain = cmdChain.then(() => { return executeCommandBuffer(buffer, lsOk); });
				}
				cmdBuffer = undefined;
				listOk = false;
				execute = false;
			}

			msgBuffer = msgBuffer.substring(msg.length + 1);
		}
	});

	socket.on('error', err => {
		con.emit('error', err, con);
	});

	con.systemUpdate = function(subSystem) {
		con.updates.push(subSystem);
		con.emit('system', subSystem);
	};

	return con;
};
