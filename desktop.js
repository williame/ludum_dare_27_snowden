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
function escapeHTMLString(str) {
	if(!(str instanceof String)) str = ""+str;
	var tagsToReplace = {
	    '&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;'
	};
	return str.replace(/[&<>]/g,function(tag) {
	    return tagsToReplace[tag] || tag;
	});
}

function rgbToHex(r,g,b) {
	function componentToHex(c) {
	    var hex = parseInt(c).toString(16);
	    return hex.length==1?"0"+hex:hex;
	}
	return "#"+componentToHex(r)+componentToHex(g)+componentToHex(b);
}

function Frame(params) {
	assert(this instanceof Frame);
	var self = this;
	params = params || this;
	this.frame = document.createElement('div');
	this.frame.addEventListener("mousedown",function(evt) { self.activate(); });
	this.frame.frame = this;
	this.frame.className = 'Frame';
	this.title = params.title || 'Untitled';
	this.titleBar = document.createElement('div');
	this.titleBar.className = 'TitleBar Unselectable';
	this.titleBar.innerHTML = this.title;
	this.icon = params.icon;
	if(this.icon) {
		this.titleBarIcon = makeIcon(this.icon);
		this.titleBar.insertBefore(this.titleBarIcon,this.titleBar.firstChild);
	}
	this.titleBar.addEventListener("mousedown",function(evt) { self.onMouseDown(evt); });
	this.titleBar.addEventListener("mousemove",function(evt) { self.onMouseMove(evt); });
	this.titleBar.addEventListener("mouseout",function(evt) { self.onMouseUp(evt); });
	this.titleBar.addEventListener("mouseup",function(evt) { self.onMouseUp(evt); });
	this.titleBar.buttons = document.createElement('div');
	this.titleBar.buttons.className = 'Buttons';
	this.titleBar.appendChild(this.titleBar.buttons);
	var icon;
	if(params.minimise) {
		icon = makeIcon("icon_minimise.png");
		icon.addEventListener('click',function(evt) { self.hide(); });
		this.titleBar.buttons.appendChild(icon);
	}
	if(params.maximise) {
		icon = makeIcon("icon_maximise.png");
		icon.addEventListener('click',function(evt) { if(self.maximised) self.restore(); else self.maximise(); });
		this.titleBar.buttons.appendChild(icon);
	}
	if(params.close) {
		icon = makeIcon("icon_close.png");
		icon.addEventListener('click',function(evt) { self.close(); });
		this.titleBar.buttons.appendChild(icon);
	}
	if(params.startMenu)
		taskBar.addStartMenu(this);
	this.frame.appendChild(this.titleBar);
	this.contents = document.createElement('div');
	this.contents.className = params.resize? 'Contents Resizeable': 'Contents';
	if("x" in params) this.contents.style.left = params.x+"px";
	if("y" in params) this.contents.style.right = params.y+"px";
	if("width" in params) this.contents.style.width = params.width+"px";
	if("height" in params) this.contents.style.height = params.height+"px";
	this.frame.appendChild(this.contents);
	document.body.appendChild(this.frame);
	if(params.show) this.show(); else this.hide();
}
Frame.prototype = {
	activate: function() {
		if(this !== taskBar.activeFrame) {
			taskBar.activeFrame = this;
			this.frame.style.zIndex = taskBar.zIndexSeq++;
			if(paperclip) paperclip.hide();
			taskBar.startMenu.style.display = "none";
		}
	},
	isShown: function() {
		return this.frame.style.display == 'block';
	},
	show: function() {
		if(!this.isShown()) {
			if(!this.taskBarButton)
				taskBar.addFrame(this);
			taskBar.shownFrames++;
			this.frame.style.display = 'block';
			this.frame.style.left = ""+(taskBar.shownFrames*50)+"px";
			this.frame.style.top = ""+(taskBar.shownFrames*40)+"px";
			this.ensureVisible();
		}
		this.activate();
	},
	hide: function() {
		if(!this.isShown()) return;
		if(this.maximised)
			this.restore();
		this.frame.style.display = 'none';
	},
	maximise: function() {
		this.maximised = [
			this.frame.style.left,
			this.frame.style.top,
			this.contents.style.width,
			this.contents.style.height,
			this.contents.className];
		this.contents.className = "Contents";
		taskBar.adjustMaximisedWindows();
	},
	restore: function() {
		this.contents.className = this.maximised[4];
		this.frame.style.left = this.maximised[0];
		this.frame.style.top = this.maximised[1];
		this.contents.style.width = this.maximised[2];
		this.contents.style.height = this.maximised[3];
		this.maximised = false;
		this.ensureVisible();
	},
	close: function() {
		this.hide();
		taskBar.removeFrame(this);
	},
	onMouseDown: function(evt) {
		var x = evt.pageX-this.frame.offsetLeft, y = evt.pageY-this.frame.offsetTop;
		this.pin = [x,y];
		this.titleBar.style.cursor = "default";
		this.activate();
	},
	onMouseMove: function(evt) {
		if(this.pin) {
			var x = evt.pageX-this.pin[0], y = evt.pageY-this.pin[1];
			this.frame.style.left = x+"px";
			this.frame.style.top = y+"px";
			this.ensureVisible();
			this.titleBar.style.cursor = "default";
		}
	},
	onMouseUp: function(evt) {
		this.pin = null;
	},
	setIcon: function(name) {
		this.icon = name;
		this.titleBarIcon.src = name;
		this.taskBarButton.icon.src = name;
	},
	ensureVisible: function() {
		if(!this.isShown()) return;
		var	rect = this.frame.getBoundingClientRect(),
			bar = taskBar.bar.getBoundingClientRect();
		if(rect.right > bar.right)
			this.frame.style.left = (bar.right-rect.width)+"px";
		if(rect.bottom > bar.top)
			this.frame.style.top = (bar.top-rect.height)+"px";
		if(rect.left < 0)
			this.frame.style.left = "0px";
		if(rect.top < 0)
			this.frame.style.top = "0px";
	},
}

function Terminal(params) {
	Frame.call(this,params);
	var self = this;
	params = params || this;
	this.frame.style.backgroundColor = "black";
	this.terminal = document.createElement('div');
	this.terminal.className = 'Terminal';
	this.lines = [];
	this.contents.appendChild(this.terminal);
	this.commandLine = document.createElement('div');
	this.commandLine.className = 'CommandLine';
	this.commandInput = document.createElement('input');
	this.commandInput.className = 'CommandInput';
	this.commandPrompt = document.createElement('label');
	this.commandPrompt.className = 'CommandPrompt';
	this.commandPrompt.htmlFor = this.commandInput;
	this.prompt = (params.prompt || this.prompt);
	this.commandPrompt.innerHTML = escapeHTMLString(this.prompt);
	this.commandLine.appendChild(this.commandPrompt);
	var wrap = document.createElement('span');
	wrap.className = 'CommandWrap';
	wrap.appendChild(this.commandInput);
	this.commandLine.appendChild(wrap);
	this.terminal.appendChild(this.commandLine);
	this.commandInput.addEventListener('keyup',function(evt) {
		switch(evt.keyCode) {
		case 13: self.submit(); break;
		case 38: self.historyPrev(); break;
		case 40: self.historyNext(); break;
		default: return;
		}
		evt.preventDefault();
	});
	this.contents.addEventListener('click',function() { self.activate(); });
	this.history = [];
	this.historyIdx = 0;
	if(this.welcome)
		this.welcome();
}
Terminal.prototype = {
	__proto__: Frame.prototype,
	prompt: '>',
	close: function() {
		Frame.prototype.close.apply(this,arguments);
		this.lines = [];
		this.history = [];
		this.historyIdx = 0;
		while(this.terminal.firstChild != this.commandLine)
			this.terminal.removeChild(this.terminal.firstChild);
		if(this.welcome)
			this.welcome();
	},
	activate: function() {
		Frame.prototype.activate.call(this);
		if(this.commandInput)
			this.commandInput.focus();
	},
	emit: function(line) {
		this.lines.push(line);
		return this.emitHTML(escapeHTMLString(line));
	},
	emitHTML: function(innerHTML) {
		var row = document.createElement('div');
		row.className = "Row";
		row.innerHTML = innerHTML;
		this.terminal.insertBefore(row,this.commandLine);
		this.contents.scrollTop = this.contents.scrollHeight;
		return this;
	},
	submit: function() {
		if(this.commandInput.value.trim().length)
			this.history.push(this.commandInput.value);
		this.historyIdx = this.history.length;
		var cmd = this.commandInput.value.toUpperCase().trim();
		this.commandInput.value = "";
		this.execute(cmd);
	},
	execute: function(cmd) {
		this.emit(this.prompt+" "+cmd);
	},
	historyPrev: function() {
		if(this.historyIdx == 0 || !this.history.length) return;
		this.historyIdx--;
		this.commandInput.value = this.history[this.historyIdx];
	},
	historyNext: function() {
		if(this.historyIdx == this.history.length-1 || !this.history.length) return;
		this.historyIdx++;
		this.commandInput.value = this.history[this.historyIdx];
	},
};

function PRISM() {
	Terminal.call(this,{
			title: "PRISM Database Query System",
			icon: "icon_prism.png",
			resize: true, show: true,
			maximise:true, minimise:true, close:true,
			startMenu:true,
		});
	this.queue = [];
}
PRISM.prototype = {
	__proto__: Terminal.prototype,
	welcome: function() {
		this.	emit("<== Welcome to the PRISM Database Query System ==>").
			emit("Audit logging is disabled.").
			emit("Have a nice day.").
			emit("(type HELP for help)");
	},
	execute: function(cmd) {
		switch(cmd) {
		case "HELP":
			paperclip.activate();
			break;
		default:
			this.queue.push(cmd);
			if(this.queue.length == 1)
				this.send();
		}
	},
	systemQuery: function(sql,remark) {
		var save = this.commandInput.value;
		this.commandInput.value = sql;
		this.submit();
		this.show();
		this.maximise();
		if(remark) this.emit(remark);
		this.commandInput.value = save;
	},
	send: function() {
		var sql = this.queue[0];
		this.emit(this.prompt+" "+sql);
		game.send({cmd:"sql",sql:sql},null,this.receive,this);
	},
	receive: function(data) {
		var cmd = this.queue.shift();
		console.log(cmd,data);
		if(!data.ok) {
			this.emit(data.error);
			return;
		}
		if(data.rows.length) {
			var columns = data.columns, tableHTML = "<table border=1><tr>";
			for(var i in columns)
				tableHTML += "<th>"+columns[i];
			for(var row in data.rows) {
				tableHTML += "<tr>";
				row = data.rows[row];
				for(var i in columns)
					tableHTML += "<td>"+row[i];
			}
			tableHTML += "</table>";
			this.emitHTML(tableHTML);
		}
		if(data.remarks) this.emit(data.remarks);
		this.emit(data.rows.length+" rows");
		if(this.queue.length)
			this.send();
		cmd = cmd.trim().toLowerCase();
		var startsWith = function(str,prefix) { return str.indexOf(prefix)==0; };
		if(!this.leet && (startsWith(cmd,"update")||startsWith(cmd,"delete")||startsWith(cmd,"insert")) && data.rows.length) {
			this.leet = true;
			setTimeout(function() { mail.addMessage({
				from:"NSA_Agent_Credits@nsa.gov",
				subject:"Congratulations!  Progress Reported",
				body:	"<p>Your supervisor has informed us that you have graduated to <i>hacking</i> systems "+
					"owned by <strike>foreign powers</strike>/<strike>American citizens</strike>/the international community/<strike>terrorists</strike>* !</p>"+
					"<p>On behalf of all freedom-loving peoples, we salute you!</p>"+
					"<p><small>(* delete where appropriate)</small></p>",
			}); },6000);
		}
	},
};

function Paperclip() {
	assert(this instanceof Paperclip);
	var self = this;
	this.clippy = document.createElement('div');
	this.clippy.className = "Paperclip";
	this.clippy.innerHTML = '<img src="paperclip.gif">';
	document.body.appendChild(this.clippy);
	this.speech = document.createElement('div');
	this.speech.className = "PaperclipSpeech";
	this.speech.innerHTML =
		'<p>It looks like you are trying to find things in the PRISM database!</p>'+
		'<p>Can I help you with that?</p>'+
		'<ul>'+
		'<li id="qWatchlist">I would like to see who is on the watchlist</li>'+
		'<li id="qRussiaFlight">I would like to see all flights leaving Russia</li>'+
		'<li id="qParFlight">I would like to see everybody taking a particular flight</li>'+
		'<li id="qHostileFlights">I would like to see everybody landing in a hostile country</li>'+
		'<li id="qParFlights">I would like to see everybody who took two particular flights</li>'+
		'</ul>';
	var questions = this.speech.getElementsByTagName('li');
	for(var i=0; i<questions.length; i++) {
		questions[i].addEventListener('click',function(evt) { 
			self.show(evt.target.id);
		});
		questions[i].style.cursor = "pointer";
	}
	document.body.appendChild(this.speech);
	this.help = new Frame({
		title: "PRISM SQL Help",
		maximise:true, minimise:true, resize:true,
		show: false, icon:"icon_help.png", close:true,
		startMenu:true,});
	this.help.contents.style.padding = "10px";
	this.help.contents.innerHTML =
		"<h3>Structured Query Language (SQL)</h3>"+
		"<p>The PRISM database system uses a very basic form of SQL to show/modify who is on which flight</p>"+
		"<h3>How can I know which tables are in the database?</h3>"+
		"<p><code>SHOW TABLES</code></p>"+
		"<h3>How can I see the data in a table?</h3>"+
		"<p><code>SELECT * FROM <i>table</i></code> will show all columns in the table.</p>"+
		"<p>You can also list just specific columns: <code>SELECT <i>column1</i>, <i>column2 ...</i> FROM <i>table</i></code></p>"+
		'<h3 id="qWatchlist">Example: seeing all the people on the watchlist</h3>'+
		"<p><code>SELECT * FROM watchlist</code></p>"+
		"<h3>How do I know which columns are in a table?</h3>"+
		"<p><code>DESCRIBE <i>table</i></code></p>"+
		"<p><code>DESC <i>table</i></code> also works</p>"+
		"<h3>How can I select only some of the rows in a table?</h3>"+
		"<p>This is done using the <code>WHERE</code> clause.  E.g. <code>SELECT * FROM airports WHERE category = 'hostile'</code></p>"+ 
		"<h3>How can I show rows in one table that are referenced from another?</h3>"+
		"<p>This is called <b><i>joining</i></b>.  PRISM SQL Supports a very basic form using the <code>WHERE</code> clause.</p>"+
		'<p id="qRussiaFlight">E.g. to see all the flights leaving Russia:</p>'+
		"<p><code>SELECT * FROM AIRPORTS AS A, FLIGHTS AS F WHERE F.DEPART = A.CODE AND A.COUNTRY = 'RUSSIA'</code></p>"+
		"<p>Notice the use of <code>AS <i>alias</i></code>; this tidies up queries a lot!</p>"+
		'<h3 id="qParFlight">How can I see who is taking a particular flight?</h3>'+
		"<p><code>SELECT T.* FROM TARGETS AS T, MANIFESTS AS M WHERE M.PASS = T.PASS AND M.FLIGHT = 'BA-26'</code></p>"+
		'<h3 id="qHostileFlights">How can I see the flights landing in a particular category of country?</h3>'+
		"<p><code>SELECT F.CODE, F.ARRIVE, F.ARRIVAL_TIME FROM AIRPORTS AS A, FLIGHTS AS F WHERE F.ARRIVE = A.CODE AND A.CATEGORY='HOSTILE'</code></p>"+
		'<h3 id="qParFlights">How can I see everyone who took two flights?</h3>'+
		"<p>If you're getting the hang of this joining business:</p>"+
		"<p><code>SELECT M.PASS FROM MANIFESTS AS M, MANIFESTS AS M2 WHERE M.PASS = M2.PASS AND M.FLIGHT = 'AF-321' AND M2.FLIGHT = 'IB-794'</code></p>"+
		"<p>This will show you a list of passport numbers, but to see the passenger names too we also have to join in the <code>Targets</code> table.  This will take a lot longer to compute:</p>"+
		"<p><code>SELECT T.* FROM MANIFESTS AS M, MANIFESTS AS M2, TARGETS AS T WHERE T.PASS = M.PASS AND M.PASS = M2.PASS AND M.FLIGHT = 'AF-321' AND M2.FLIGHT = 'IB-794'</code></p>"+
		"<h3>Filtering by dates</h3>"+
		"<p>Date strings can be compared using <code>&lt;</code>, <code>&gt;=</code> etc.  There is also a constant called <code>now</code>.  E.g. to see all the flights currently in the air:</p>"+
		"<p><code>SELECT * FROM FLIGHTS WHERE DEPARTURE_TIME >= NOW AND ARRIVAL_TIME <= NOW</code></p>"+
		"<h3>Can I add rows too?</h3>"+
		"<p><code>INSERT INTO <i>table</i> (<i>field1</i>,...) VALUES (<i>value1</i>,...);</code></p>"+
		"<p>There's more!  <code>DELETE FROM</code> and <code>UPDATE <i>table</i> SET</code> are also supported!</p>"+
		"<h3>There's a bug in this SQL engine!</h3>"+
		"<p>What do you expect?!?!?  We wrote it from scratch in a day, in client-side Javascript!  We're dead proud it works at all!</p>";
}
Paperclip.prototype = {
	activate: function() {
		this.clippy.style.display = "block";
		this.speech.style.display = "block";
		taskBar.activeFrame = null;
	},
	hide: function() {
		this.clippy.style.display = "none";
		this.speech.style.display = "none";
	},
	show: function(question) {
		this.help.show();
		question = this.help.contents.querySelector("#"+question);
		if(question)
			this.help.contents.scrollTop = question.offsetTop;
	},
};

function Mail() {
	Frame.call(this,{
		title:"NSA Internal Mail",
		show:true, resize:true,
		icon:"icon_mail.png",
		maximise:true, minimise:true, close:true,
		startMenu:true,
	});
	this.messages = [];
}
Mail.prototype = {
	__proto__: Frame.prototype,
	addMessage: function(message) {
		var self = this;
		if(!message.to)
			message.to = playerName;
		this.messages.push(message);
		message.picker = document.createElement('div');
		message.picker.className = "MessagePickerUnread";
		message.picker.innerHTML =
			'from: <i>'+message.from+'</i><br/>'+
			'to: <i>'+message.to+'</i><br/>'+
			(message.src?"src: <i>"+message.src+"</i><br/>":"")+
			'<b>'+message.subject+'</b>';
		var show = function() {
			if(!message.frame) {
				message.frame = new Frame({
					title:(message.src||"Mail")+": "+message.subject,
					resize:true,show:true,
					icon:"icon_mail.png",
					maximise:true, minimise:true, close:true,
				});
				var header = document.createElement('div');
				header.className = "MessagePicker";
				header.innerHTML = 
					'from: <i>'+message.from+'</i><br/>'+
					'to: <i>'+message.to+'</i><br/>'+
					'<b>'+message.subject+'</b>';
				message.frame.contents.appendChild(header);
				var body = document.createElement('div');
				body.className = "MessageBody";
				body.innerHTML = message.body;
				message.frame.contents.appendChild(body);
				message.frame.close = function() {
					Frame.prototype.close.call(message.frame);
					message.frame = null;
				};
				if(message.flights) {
					message.frame.contents.appendChild(document.createElement('div'));
					message.frame.contents.appendChild(document.createElement('hr'));
					var book = function(flight) {
						var	booking = document.createElement('div'),
							booked;
						booking.className = "Booking";
						booking.innerHTML = flight.code+" -&gt; "+flight.departure_time+"<br/> -&gt; "+
							flight.arrive+", "+flight.airport+", "+flight.country;
						message.frame.contents.appendChild(booking);
						booking.addEventListener('click',function() {
							if(booked) return;
							booked = true;
							game.send({cmd:"sql",
								sql:"INSERT INTO manifests (flight,pass,remark) VALUES ('"+flight.code+"','"+message.pass+"','secret agent booking')",
							},null,function() { console.log.apply(console,arguments); });
							booking.innerHTML += ' <font color="red">BOOKED</font>';
						});
					};
					message.frame.contents.appendChild(document.createElement('div'));
					var flightsButton = makeButton("Get Flights");
					flightsButton.addEventListener('click',function() {
						prism.systemQuery(
							"SELECT F.*, M.REMARK"+
							" FROM FLIGHTS AS F, MANIFESTS AS M"+
							" WHERE M.PASS = '"+message.pass+"'"+
							" AND F.CODE = M.FLIGHT;");
					});
					message.frame.contents.appendChild(flightsButton);
					for(var flight in message.flights)
						book(message.flights[flight]);
				}
			}
			message.frame.activate();
			message.read = true;
			message.picker.className = "MessagePicker";
			for(var i in self.messages)
				if(!self.messages[i].read)
					return;
			self.setIcon("icon_mail.png");
		};
		message.picker.addEventListener('click',show);
		this.setIcon("you_got_mail.gif");
		this.contents.insertBefore(message.picker,this.contents.firstChild);
		this.contents.scrollTop = 0;
		if(message.zIndex) { // force show, e.g. end-game state
			show();
			message.frame.frame.style.zIndex = message.zIndex;
		}
	},
};

function CanvasFrame(params) {
	var self = this;
	if(params.animate) {
		assert(typeof this.draw === "function");
		this.drawer = function() { self.doDraw(); };
	}	
	Frame.call(this,params);
	this.backgroundColor = params.backgroundColor;
	this.canvas = document.createElement('canvas');
	this.canvas.className = 'Canvas';
	this.contents.appendChild(this.canvas);
	this.contents.style.overflow = 'hidden';
	this.contents.style.backgroundColor = rgbToHex(params.backgroundColor[0]*255,params.backgroundColor[1]*255,params.backgroundColor[2]*255);
	if(params.trackMouse) {
		this.mousePos = null;
		this.canvas.addEventListener('mouseout',function(evt) { self.mousePos = null; });
		this.canvas.addEventListener('mousemove',function(evt) {
			var rect = self.canvas.getBoundingClientRect();
			self.mousePos = [evt.pageX-rect.left,evt.pageY-rect.top];
		});
	}
}
CanvasFrame.prototype = {
	__proto__: Frame.prototype,
	show: function() {
		if(!this.isShown() && this.drawer)
			requestAnimFrame(this.drawer);
		Frame.prototype.show.call(this);
	},
	doDraw: function() {
		if(!this.isShown() || fail.error) return;
		if(this.drawer) requestAnimFrame(this.drawer);
		var	canvas = this.canvas,
			width = this.contents.offsetWidth-canvas.offsetLeft*2,
			height = this.contents.offsetHeight-(canvas.offsetTop-this.titleBar.offsetHeight)*2;
		if(canvas.width != width || canvas.height != height) {
			canvas.width = width;
			canvas.height = height;
			if(this.gl) this.gl.viewport(0,0,width,height);
			if(this.onResize) this.onResize();
		}
		this.draw();
	},
};

function GLFrame(params) {
	CanvasFrame.call(this,params);
	var	glParams = { alpha: false, },
		gl = this.gl = this.canvas.getContext('webgl',glParams) || this.canvas.getContext('experimental-webgl',glParams);
	if(!gl) fail("webGL is not supported");
	gl.clearColor(this.backgroundColor[0],this.backgroundColor[1],this.backgroundColor[2],this.backgroundColor[3]);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
}
GLFrame.prototype = {
	__proto__: CanvasFrame.prototype,
	show: function() {
		if(!this.isShown())
			requestAnimFrame(this.drawer);
		CanvasFrame.prototype.show.call(this);
	},
};

function TabbedPane(params) {
	Frame.call(this,params);
	this.tabs = [];
	this.bar = document.createElement('div');
	this.bar.className = 'TabBar';
	this.contents.appendChild(this.bar);
	this.activeTab = null;
}
TabbedPane.prototype = {
	__proto__: Frame.prototype,
	addTab: function(title,contents,icon) {
		var	self = this,
			tab = {title:title,contents:contents,button:makeButton(title,icon),},
			activate = function() {
				if(self.activeTab) {
					self.contents.removeChild(self.activeTab.contents);
					self.activeTab.button.className = "Button";
				}
				self.activeTab = tab;
				tab.button.className = "Button Selected";
				self.contents.appendChild(tab.contents);
				self.bar.scrollLeft = tab.button.offsetLeft;
			};
		this.tabs.push(tab);
		this.bar.insertBefore(tab.button,this.bar.firstChild);
		tab.button.addEventListener('click',activate);
		activate();
	},
};

function makeIcon(filename) {
	var icon = document.createElement('image');
	icon.className = 'Icon';
	icon.src = filename;
	return icon;
}

function makeButton(value,icon) {
	var button = document.createElement('div');
	button.className = "Button";
	if(value) button.innerHTML = escapeHTMLString(value);
	if(icon) {
		button.icon = makeIcon(icon);
		button.insertBefore(button.icon,button.firstChild);
	}
	return button;
}

function TaskBar() {
	assert(this instanceof TaskBar);
	var self = this;
	this.bar = document.createElement('div');
	this.bar.className = 'TaskBar';
	this.startMenu = document.createElement('div');
	this.startMenu.className = 'StartMenu';
	document.body.appendChild(this.startMenu);
	this.startMenuButton = makeButton('Start','logo_startmenu.png');
	this.startMenuButton.addEventListener('click',function() {
		self.activeFrame = null;
		self.startMenu.style.display = "block";
	});
	this.bar.appendChild(this.startMenuButton);
	this.framePicker = document.createElement('div');
	this.framePicker.className = "FramePicker";
	this.bar.appendChild(this.framePicker);
	document.body.appendChild(this.bar);
	this.activeFrame = null;
	this.zIndexSeq = 100;
	this.shownFrames = 0;
	this.clock = document.createElement('div');
	this.clock.className = "Clock";
	document.body.appendChild(this.clock);
	window.setInterval(function() {
		self.clock.innerHTML = dateString(gameTime());
	},250);
}
TaskBar.prototype = {
	addFrame: function(frame) {
		frame.taskBarButton = makeButton(frame.title,frame.icon);
		this.framePicker.appendChild(frame.taskBarButton);
		frame.taskBarButton.addEventListener('click',function() { if(!frame.isShown()) frame.show(); else frame.activate(); });
		this.adjustMaximisedWindows();
	},
	removeFrame: function(frame) {
		this.framePicker.removeChild(frame.taskBarButton);
		frame.taskBarButton = null;
		this.adjustMaximisedWindows();
	},
	addStartMenu: function(frame) {
		var button = makeButton(frame.title,frame.icon), self = this;
		button.addEventListener('click',function() { self.startMenu.style.display="none"; if(!frame.isShown()) frame.show(); else frame.activate(); });
		this.startMenu.appendChild(button);
	},
	adjustMaximisedWindows: function() {
		var frames = document.body.querySelectorAll(".Frame");
		for(var i=0; i<frames.length; i++) {
			var frame = frames[i].frame;
			if(frame.maximised) {
				frame.frame.style.left = 0;
				frame.frame.style.top = 0;
				var padding = (parseInt(frame.contents.style.padding)||0)*2;
				frame.contents.style.width = (window.innerWidth-(frame.frame.clientLeft*2+padding))+"px";
				frame.contents.style.height = (this.bar.offsetTop-(frame.contents.offsetTop+frame.frame.clientTop*2+padding))+"px";
			} else
				frame.ensureVisible();
		}
	},
};

window.onresize = function(evt) {
	taskBar.adjustMaximisedWindows();
}

