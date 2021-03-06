const mpd = require('../');

function handleCommand(cmd, params) {
	console.log('command received: ' + cmd);
	return Promise.resolve('');
}

const server = mpd(handleCommand);
server.on('connection', s => {
	console.log('client connected');
	s.on('end', () => { console.log('client disconnected'); });
});
server.on('disconnect', s => {
	console.log('client disconnected');
});

server.on('error', (err, s) => { console.log(err); });

server.listen({ port: 6600 }, () => {
	console.log('opened server on', server.server.address());
});


setTimeout(() => { server.systemUpdate('player'); }, 7000);
