		var latte_lib = require("latte_lib");
			var latte_watch = require("latte_watch");
			var Modules = require("latte_require");
			var defaultConfig = {
				reloadTime: 3 * 1000
			};
      function RPC(config) {
        if(latte_lib.isString(config)) {
			config = { path: config }
		};
		this.config = latte_lib.merger(defaultConfig, config);
        this.methods =  {};
        this.watcher = null;
        this.id = 0;
        this.start();
      };
      latte_lib.inherits(RPC, latte_lib.events);
      (function() {
      		this.start = function() {
				this.rpcRequire =  Modules.create("./");
 				if(!this.config.path) {
 					return;
 				}
 				this.loadDir(this.config.path);		
 				var self = this;
 				var watcher = this.watcher = latte_watch.create(this.config.path);
				watcher.on("addDir", function(addDirName ) {
					self.loadDir(addDirName);
				});
				watcher.on("unlink" , function() {
					self.reload();
				});
				watcher.on("unlinkDir", function(){
					self.reload();
				});
				watcher.on("add", function(filename) {
					self.loadFile(filename);
				});
				watcher.on("change", function() {
					self.reload({
						event: "fileChange",
					});
				});				
 			}
			this.loadDir = function(path) {
 				var self = this;
 				var files = latte_lib.fs.readdirSync(path);
 				files.forEach(function(filename) {
 					var stat = latte_lib.fs.statSync(path + "/" + filename);
					if(stat.isFile()) {
					 	self.loadFile(path + "/"+ filename);
					}else if(stat.isDirectory()){
			 			self.loadDir(path + "/" + filename);
					}
 				});
 			}
       this.reload = function(event) {
			this.reloadList = this.reloadList || [];
			this.reloadList.push(event);
			if(this.reloadList.length > 1) {
				return;
			}
			var self = this;
			setTimeout(function() {
				//this.config.path = path;
				self.rpcRequire =  Modules.create("./");
				self.loadDir(self.config.path);	
				self.emit("reload");
				self.reloadList.forEach(function(e) {
					console.log(e);
				});
				self.reloadList = [];
			}, this.config.reloadTime);
			
		}
        this.Call = function(method, params, socket, cb) {
          var self = this;
          if(latte_lib.isFunction(socket)) {
            cb = socket;
            socket = null;
          }
          this.write({
            method: method,
            params: params,
            id: ++self.id
          }, socket);
          if(cb) {
            this.once(self.id, cb);
          }
        }
        this.setMethod = function(method, func) {
          this.methods[method] = func;
        }
          var backData = function(err, result, id) {
              return {
                error: err,
                result : result,
                id: id
              };
          }
        this.addWorker = function(worker) {
          var self = this;
          worker.rpc = this;
          worker.process.on("message", function(data, socket) {
            if(socket) {
              socket.readable = socket.writeable = true;
              socket.resume();
            }
            if(data.method) {
              var method = self.methods[data.method];
              if(method) {
                if(!latte_lib.isArray(data.params)) {
                  data.params = [].concat(data.params);
                }
                socket && data.params.push(socket);
                data.params.push(function(err, result, s) {
                    worker.send(backData(err, result, data.id), s);
                });
        				try {
        					 method.apply(worker, data.params);
        				}catch(e) {
        					self.emit("error", e);
        				}

              }
            }else if(data.id) {
             
              self.emit(data.id, data.error, data.result, socket);
            }
          });
        }
      }).call(RPC.prototype);
		module.exports = RPC;