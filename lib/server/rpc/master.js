
 		var latte_lib = require("latte_lib");
 		var ORPC = require("./orpc");
 		/**
 			methods里方法的执行者是worker 

 			@class Master


 		*/
 		var Modules = require("latte_require");
 		var Master = function(config, server) {
 			ORPC.call(this, config);
 			this.workers = [];
 			

 		};
 		latte_lib.inherits(Master, ORPC);
 		(function() {
 				this.CallAll = function(method, params, socket, cb){
 					if(latte_lib.isFunction(socket)) {
 						cb = socket;
 						socket = null;
 					}
 					var self = this;
 					var funcs = [];

 					this.workers.forEach(function(worker) {
 						if(!worker) {
 							return;
 						}
 						funcs.push(function(callback) {
 							self.Call(worker, method, params, socket, callback);
 						});
 					});

 					latte_lib.async.parallel(funcs, function(err, data) {
 						//console.log("callbackAll",data);
 						cb(err, data);
 					});
 				}
 				/**
 					发送给进程消息
 					@method Call
 					@param worker {Cluster Worker} or {Child_Process}
 					@param method {Function}
 					@param params {Array}
 					@param Socket {socket}
 					@param cb {Function}
 				*/
 				this.Call = function(worker , method , params, socket, cb) {
 					var id = ++ this.id;
 					if(latte_lib.isFunction(socket)) {
 						cb = socket;
 						socket = null;
 					}
 					worker.send({
 						method: method,
 						params: params,
 						id: id
 					}, socket);
 					cb && this.once(id, function(err, data) {
 						cb(err, data);						
 					});
 				}


 			this.restart = function() {
 				this.close();
 				this.start();
 			}
 			/**
 				关闭rpc 通讯进程
 				@method rpcClose 

 			*/
 			this.close= function() {
 				if(!this.worker) {
 					return;
 				}
 				this.worker.kill('SIGHUP');
 				this.worker = null;
 			}
 			/**
 				创建rpc通讯进程
 				@method start
 			*/
 			


 			

 			

 			this.loadFile = function(path) {
 				var self = this;
			 	var o ;
			 	try {
				 	o = self.rpcRequire.require("./"+path);
			 	}catch(err) {
			 		if(process.latte && process.latte.debug) {
			 			throw err;
			 		}else{
			 			var filename = "./logs/loadWebRpc/"+latte_lib.format.dateFormat()+".log";
					 	latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
				 	
			 		}
				 	
				 	return ;
			 	}
			 	if(o.master) {
			 		self.setMethod(o.method, o.master);
			 	}
 			}



 			/**
 				@method send
 				@param data {JSON}
 				@param socket {Socket}
 			*/
 			this.send = function(data, socket) {
 				var self = this;
 				if(this.worker) {				
 					this.worker.send(data, socket);
 				}else{
 					this.sendCaches.push({
 						data: data,
 						socket: socket
 					});
 					//this.worker.send(data, socket);
 				}
 				
 			}
 				/**
 					@method backData
 					@param err {String}||{Json}
 					@param result {Json}
 					@param id {Int}
 					@return {JSON}
 				*/
 				var backData = function(err, result, id) {
	              	return {
	                	error: err,
		                result : result,
		                id: id
	              	};
	          	}
	        /**
	        	添加slave
	        	@method addWorker
	        	@param worker
				
	        */
 			this.addWorker = function(worker) {
 				ORPC.prototype.addWorker.call(this, worker);
 				this.workers[worker.id] = worker;
 				var self = this;
 				worker.rpc = this;
 			}
 			/**
 				@method removeWorker
				@param worker {Worker}
 			*/
 			this.removeWorker = function(worker) {
 				var index = this.workers.indexOf(worker);
 				this.workers[index] = null;
 			}
 			
 		}).call(Master.prototype);
 		module.exports = Master;