		var latte_lib = require("latte_lib")
			, ORPC = require("./orpc")
			, Cluster = require("cluster");
		function RPC(config, server) {
			ORPC.call(this, config);
			this.addWorker(Cluster.worker);
			var self = this;
			this.server= server;
		};
		latte_lib.inherits(RPC, ORPC);
		(function() {
			this.loadFile = function(path) {
				 var self = this;
				 var o ;
				 try {
					 o = self.rpcRequire.require("./"+path);
				 }catch(err) {
				 	self.emit("loadError");
				 	return;
				 }
				 if(o.slave) {
					 	self.setMethod(o.method, o.slave);
				 }
			}

			this.addWorker = function(worker) {
				this.worker = worker;
				ORPC.prototype.addWorker.call(this, this.worker);
			}
			this.write = function(data,handle) {
				this.worker.process.send(data, handle);
			}
		}).call(RPC.prototype);
		module.exports = RPC;