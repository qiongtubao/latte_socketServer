(function() {
	this.method = "latte_state";
	this.handle = function(callback) {
		this.server.rpc.Call("latte_state", [], function(err, o) {
			callback(err, o);
		});
	}
}).call(module.exports);