# MPD-server

A node js implementation of the [MPD protocol](https://www.musicpd.org/doc/protocol/). This library should make it easier to implement this protocol in your applications.

## Getting Started

### Installing

```
npm i mpd-server
```

### Usage

```javascript
'use strict';
// returns a function to create a mpd-server object
// this function expects a commandHandler function.
const mpd = require('mpd-server');

// The commandHandler function gets the command, arguments and connection from which it is requested.
// It needs to return an promise which returns a string value
function handleCommand(cmd, params, con) {
	// the idle is handled internally and does not go through here
	console.log('Command: ' + cmd);
	return Promise.resolve('command response');
}

// create the mpd server given the function which will handle the commands
const mpdServer = mpd(handleCommand);

// start listening for connections
mpdServer.listen({ port: 6600 }, () => {
	console.log('mpd running on ', mpdServer.server.address());
});

// register any callback your interested in
mpdServer.on('error', (err, s) => { console.log(err); });

// call this when a subsystem changes to notify the clients
server.systemUpdate('subsystem');
```

#### Server

##### Methods

- **constructor** *(cmdHandler)*

Constructor of hte mpd server. The command handler function is responsible to handle all [commands](https://www.musicpd.org/doc/html/protocol.html#command-reference) send by the clients. The only exception here is the `idle`. This command is handled internally. This function must return a promise which resolves to the response for the client.

- **listen** *(options)*

Start listening for clients. The options are passed to the [server listen](https://nodejs.org/api/net.html#net_server_listen_options_callback).

- **systemUpdate** *(subsystem)*

Notify a subsystem update.

##### Events
- **connect** *(connection)*
- **disconnect** *(connection)*
- **error** *(error, connection)*

##### Objects
- server: [net.Server](https://nodejs.org/api/net.html#net_class_net_server)
- connections: [Connection](https://github.com/depuits/mpd-server#connection)[]

#### Connection

##### Events
- **connect** *(connection)*
- **disconnect** *(connection)*
- **idle** *(connection)*

Emitted when the connection is going in to idle mode as describe [here](https://www.musicpd.org/doc/html/protocol.html#querying-mpd-s-status).

- **noidle** *(connection)*

Emitted when the connection exits the idle mode.

- **error** *(error, connection)*

Emitted on socket error event. 

- **commanderror** *(error, connection, errorAck)*

Emitted when a command handler failed. The third parameter is the error  response as described in the [protocol](https://www.musicpd.org/doc/html/protocol.html#failure-responses).

- **system** *(subsystem, connection)*

Emitted when a subsytem update is send.

##### Objects
- socket: [net.Socket](https://nodejs.org/api/net.html#net_class_net_socket)

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/depuits/mpd-server/tags). 

## License

This project is licensed under the Apache License - see the [LICENSE](LICENSE) file for details
