/**
 * Copyright (C) 2013 William Edwards.  All rights reserved.
 * 
 * This program is free software; you can redistribute it and/or 
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed WITHOUT ANY WARRANTY; without even the 
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
 * See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */

function fail(msg) {
	fail.error = new Error(msg? msg.stack? msg+"\n"+msg.stack: msg: "an error occurred");
	throw fail.error;
}

function assert(expr,msg) {
	if(!expr)
		fail(msg);
}

if(self.document) {
	window.WebWorker = function(scriptFilenames,dispatch) {
		this.scriptFilenames = scriptFilenames; // array of strings, in import order
		this.dispatch = dispatch; // name of main dispatch function
		this.worker = null;
		this.inflight = [];
	}
	WebWorker.prototype = {
		synthesised: !window.Worker || window.location.search.indexOf("NoWebWorkers") != -1,
		send: function(data,transferrable,callback,ctx) {
			if(!callback) {
				callback = this.defaultCallback;
				ctx = this;
			} else
				ctx = ctx||window;
			if(this.synthesised) {
				if(!this.worker) {
					var	self = this,
						load = function() {
							if(self.scriptFilenames.length) {
								var scriptFilename = self.scriptFilenames.shift();
								var scripts = document.getElementsByTagName("script");
								for(var i=0; i<scripts.length; i++)
									if(scripts[i].src == scriptFilename) {
										console.log(scriptFilename,"already loaded");
										load();
										return;
									}
								console.log("loading",scriptFilename);
								var script = document.createElement('script');
								script.setAttribute("type","text/javascript");
								script.setAttribute("src",scriptFilename);
								script.onerror = fail;
								script.async = true;
								script.onload = function() {
									if(!script.readyState || script.readyState == "loaded" || script.readyState == "complete")
										load();
								};
								document.getElementsByTagName("head")[0].appendChild(script);
							} else {
								self.dispatch = window[self.dispatch] || fail("bad dispatch: "+self.dispatch);
								for(var queued in self.queued) {
									queued = self.queued[queued];
									try {
										var ret = self.dispatch.call(self.worker,queued[0]);
										queued[1].call(queued[2],ret);
									} catch(error) {
										fail(error+" "+error.stack);
									}
								}
								self.queued = null;
							}
						};
					this.worker = {};
					this.queued = [[data,callback,ctx]];
					load();
				} else if(this.queued) {
					this.queued.push([data,callback,ctx]);
				} else try {
					ret = this.dispatch.call(this.worker,data);
					callback.call(ctx,ret);
				} catch(error) {
					fail(error+" "+error.stack);
				}
			} else {
				if(!this.worker) {
					var self = this;
					this.worker = new Worker("web_worker.js");
					this.worker.onerror = fail;
					this.worker.onmessage = function() { self.receive.apply(self,arguments); };
					this.worker.postMessage({
							scriptFilenames: this.scriptFilenames,
							dispatch: this.dispatch,
						});
				}
				var args = Array.prototype.slice.call(arguments,4);
				this.worker.postMessage(data,transferrable||[]);
				this.inflight.push([callback,ctx,args]);
			}
		},
		receive: function(evt) {
			var data = evt.data;
			if(data.error) {
				console.log(data);
				fail(data.error);
			}
			if("ret" in data) {
				var	callback = this.inflight.shift(),
					ctx = callback[1], args = callback[2], callback = callback[0];
				if(callback) {
					if(typeof data.ret !== "undefined")
						args.unshift(data.ret);
					callback.apply(ctx,args);
				}
			} else if("console" in data) {
				console.log("(from WebWorker): ",data.console);
			} else if("message" in data) {
				this.onmessage(data.message);
			} else
				fail("unsupported message from webWorker:",data);
		},
		onmessage: function(data) {
			console.log("unhandled message from web worker:",data);
		},
		defaultCallback: function(data) {
			console.log("unhandled response from web worker:",data);
		},
	};
} else {
	self.window = self;
	self.console = {
		log: function() {
			postMessage({ console: Array.prototype.join.call(arguments), });
		},
	};
	self.onmessage = function(evt) {
		try {
			if(fail.error)
				throw fail.error;
			var cmd = evt.data;
			if(!self.dispatch) {
				for(var script in cmd.scriptFilenames) {
					console.log("loading",cmd.scriptFilenames[script]);
					importScripts(cmd.scriptFilenames[script]);
					console.log("loaded",cmd.scriptFilenames[script]);
				}
				self.dispatch = self[cmd.dispatch];
				assert(self.dispatch,"dispatch not specified");
			} else
				postMessage({ ret:self.dispatch(cmd), console:console.lines, });
		} catch(error) {
			postMessage({ ret:true, error:""+error, stack:error.stack, });
		}
	};
	self.sendMessage = function(data) {
		postMessage({ message: data, });
	};
}
