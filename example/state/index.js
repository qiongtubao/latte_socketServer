var Server = require("../../lib/index.js");
var server = new Server({
	port: 9345,
	handle: {
		path: "./handle"
	},
	rpc:{
		path: "./rpc"
	}
});
server.run();