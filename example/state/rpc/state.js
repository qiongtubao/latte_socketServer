(function() {
	this.method = "latte_state";
	this.slave = function( callback) {
		
		callback(null , {
			socketNum: this.rpc.server.handle.size(),
			momory: process.memoryUsage()
		});
	}
	this.master = function( callback) {
		this.rpc.CallAll("latte_state", [], function(err, data){
			callback(err, data);
		});
	}
}).call(module.exports);