var latte_lib = require("latte_lib")
	, latte_watch = require("latte_watch")
	, Modules = require("latte_require")
	, defaultConfig = {
		reloadTime: 3 * 1000
	};

var Handle = function(config, server) {
	this.config = latte_lib.merger(defaultConfig, config);
	this.rpc = null;
	this.watcher = null;
	this.sockets = [];
	this.methods = {};
	this.server = server;
	this.start();
};
latte_lib.inherits(Handle, latte_lib.events);
(function() {
	this.size = function() {
		return this.sockets.length;
	}
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

	this.loadFile = function(path) {
		 var self = this;
		 var o ;
		 try {
			 o = self.rpcRequire.require("./"+path);
		 }catch(err) {
		 	console.log(err);
		 	self.emit("loadError");
		 	return;
		 }
		 if(o.handle) {
			 	self.setMethod(o.method, o.handle);
		 }
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
		}, self.config.reloadTime);
		
	}

	var backData = this.backData = function(err, result, id) {
        return {
          error: err,
          result: result,
          id: id
        };
  	};
	this.setMethod = function(method, fn) {
		this.methods[method] = fn;
	}
	this.addSocket = function(socket) {
		var self = this;
		socket.Call = function(method, params, callback) {
			socket.write(JSON.stringify({
				method:method,
				params: params,
				id: ++self.id
			}));
			callback && self.once(self.id, callback.bind(socket));
		}
		socket.on("data", function(data) {
			try{
				data = JSON.parse(data.toString());
			}catch(e) {
				return console.log(e, data.toString());
			}
			
			if(data.method) {
				var method = self.methods[data.method]
				if(method) {
					if(!latte_lib.isArray(data.params)) {
						data.params = [].concat(data.params);
					}
					data.params.push(function(err, result) {
                  		socket.write(JSON.stringify(self.backData(err, result, data.id))+"\n");
                  	});
                  	try {
						method.apply(socket, data.params);
					} catch(e) {
						self.emit("error", e);
					}
				}else if(data.id) {
                	self.emit(data.id , data.error, data.result);
              	}
			}else{
				console.log("no method:",data.method);
			}
		});	
		socket.on("end", function() {
			var index = self.sockets.indexOf(socket);
			if(index != -1) {
				self.sockets.splice(index , 1);
			}
		});
		this.sockets.push(socket);
	}
}).call(Handle.prototype);
module.exports = Handle;