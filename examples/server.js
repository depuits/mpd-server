const mpd = require('../');

const server = mpd();
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

