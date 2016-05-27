
	var Cluster = require("cluster")
		, latte_lib = require("latte_lib")
		, Net = require("net")
		, Rpc = Cluster.isMaster ? require("./rpc/master") : require("./rpc/slave")
		, Handle = Cluster.isMaster? null: require("./rpc/handle");

		var defaultConfig = {};
		(function() {
			this.cpus = require("os").cpus().length;
			this.shedulingPolicy = Cluster.SCHED_RR;
			this.port = 10086;
			this.log = false;
		}).call(defaultConfig);
	var Server = function(config) {
		this.config = latte_lib.merger(defaultConfig, config);
		this.rpc = new Rpc(this.config.rpc, this);
		this.workers = [];
		if(Handle) {
			this.handle = new Handle(this.config.handle, this);
		}
		var self = this;
	};
	latte_lib.inherits(Server, latte_lib.events);
	(function() {
		this.doMaster = function(fn) {
			if(Cluster.isMaster) {
				fn();
			}
		}
		this.doSlave = function(fn) {
			if(!Cluster.isMaster) {
				fn();
			}
		}
		this.addRpcClient = function(worker) {
			this.workers.push(worker);
			this.rpc.addWorker(worker);
		}
		this.createWorker = function() {
			var worker = Cluster.fork();
			this.emit("start", worker);
			this.addRpcClient(worker);
			return worker;
		}
		this._run = function() {
			var self = this;
			var server = Net.createServer(function(socket) {
				socket.server = self;
				self.handle.addSocket(socket);
			}).on("error", function(err) {
				console.log("error");
			});
			server.listen(this.config.port);
		}
		this.run = function() {
			if(this.server) { return; }
			if(Cluster.isMaster) {
				var self = this;
				for(var i = 0, len = this.config.cpus; i < len; i++) {
					var worker = self.createWorker();
				}
				Cluster.on("exit", function(worker) {
					self.rpc.removeWorker(worker);
					if(self.config.restart) {
						var now = self.createWorker();
						self.emit("restart", worker, now);
					}
				});
				
			}else{
				this._run();
			}
		}
	}).call(Server.prototype);
	module.exports = Server;
