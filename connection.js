const EventEmitter = require('events').EventEmitter;

const MPD_OK = 'OK MPD 0.20.18';
const MPD_SENTINEL = /^.+$/m;

module.exports = function (socket, cmdHandler) {
	const con = Object.create(new EventEmitter());
	con.socket = socket;

	// client buffer values
	let cmdChain = Promise.resolve();
	let msgBuffer = '';
	let cmdBuffer = undefined;
	let execute = false;
	let listOk = false;
	let idle = false;

	function executeCommand(cmd, params) {
		switch (cmd) {
		case 'idle':
			//go into idle
			idle = true;
			return; // wait for event and then write it
		case 'noidle':
			idle = false;
			return Promise.resolve('print changed subsystems'); //TODO write change systems
		}

		// while idle we can't execute any other commands
		if (idle) {
			return Promise.reject('Can\'t execute commands while in idle.');
		}

		return cmdHandler(cmd, params).then((resp) => {
			socket.write(resp);
			if (listOk) {
				socket.write('list_OK\n');
			}
		});
	}

	// we still pass the buffer and list ok to capture the values
	function executeCommandBuffer(buffer, listOk) {
		//TODO implement the idle and no idle here

		// execute all commands in the command buffer
		return buffer.reduce((p, command, i) => p.then(() => {
			let args = command.match(/(?:[^\s"]+|"([^"]*)")+/);
			return executeCommand(args[0], args.slice(1)).catch((err) => {
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
				//chain the commands after any other commands still in execution
				cmdChain = cmdChain.then(() => { return executeCommandBuffer(cmdBuffer, listOk); });
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

	return con;
};
