
function gameSim() {
	console.log("zeroHour",zeroHour);

	var	flights = new PriorityQueue(false),
		flight, gameOver, win;
	for(flight in tableData.flights) {
		flight = tableData.flights[flight];
		flights.push([flight.departure,"depart",flight]);
		flight.departure_time = dateString(flight.departure+zeroHour);
		flights.push([flight.arrival,"arrive",flight]);
		flight.arrival_time = dateString(flight.arrival+zeroHour);
	}
	
	var giveAgentOptions = function(agent,arrived,detained,airport,body) {
		var	now = gameTime()-zeroHour,
			flights = detained?[]:tableData.flights.filter(function(obj) { return obj.depart == agent.airport && obj.departure >= now; }),
			stuck = !flights.length;
		for(var flight in flights)
			flights[flight] = {
				code:flights[flight].code,
				departure_time:flights[flight].departure_time,
				arrive:flights[flight].arrive,
				airport:airports[flights[flight].arrive].name,
				country:airports[flights[flight].arrive].country,
			};
		gameOver |= stuck && agents.length == 1;
		if(stuck) {
			agents.splice(agents.indexOf(agent),1);
			if(gameOver) {
				sendMessage({cmd:"stop",win:win,});
			}
		}
		sendMessage({tasks:[{type:"addMessage",message:{
			from:agent.firstname+"_"+agent.lastname+"_"+agent.pass+"@nsa.gov",
			subject:(detained?"DETAINED at":arrived?"Arrived at":"Reporting for duty from")+" "+airport+" "+airports[airport].name,
			body:body?body:stuck?"I'm stuck!  This is a dead end!":"where do you want me to go now?",
			pass:detained?null:agent.pass,
			flights:flights,
			zIndex:gameOver?1000006:0,
		}}],});
	};
	
	for(var agent in agents)
		giveAgentOptions(agents[agent],false,false,agents[agent].airport);
	
	var schedule = function() {
		if(!flights.size()) {
			console.log("run out of flights!");
			sendMessage({cmd:"stop",win:false,message:["run out of flights!?!?"]});
			return;
		}
		var	next = flights.pop(), at = next[0], dir = next[1], flight = next[2],
			remaining = (at-(now()-zeroHour)*gameSpeed)/gameSpeed;
		console.log("scheduling",dir,flight.code,dateString(at+zeroHour),(remaining/1000).toFixed(2)+" secs time");
		setTimeout(function() { if(!gameOver && run(flight,dir)) schedule(); },Math.max(0,remaining));
	}
	
	var run = function(flight,dir) {
		console.log("running",dateString(gameTime()),dir,flight.code,dir=="depart"?flight.depart:flight.arrive,dir=="depart"?flight.departure_time:flight.arrival_time);
		console.log("expected time:",dateString(gameTime()),"=",dir=="depart"?flight.departure_time:flight.arrival_time);
		var passengers = flight.passengers;
		flight.passengers = null;
		sendMessage({dir:dir,flight:flight});
		var manifest = tableData.manifests.filter(function(obj) { return String(obj.flight).toUpperCase() == flight.code; });
		if(dir == "depart") {
			var removed = [], doubleBooked = [], missed = [], detained = [];
			for(var pass in passengers) {
				var entry = find(manifest,"pass",pass);
				var target = targets[pass];
				if(!entry && target.airport == flight.depart) {
					var airport = airports[flight.depart];
					if(target.fugitive) {
						var snowden = strEq(target.fugitive.lastname,"snowden");
						switch(airport.country) {
						case "Hostile":
							subject = "reaches safe haven";
							body = "Due to NSA incompetence, the whistle-blower was stranded after flight scheduling computer databases where hacked by the lack-luster American intelligence agency, sources say.";
							break;
						case "Neutral":
							subject = "is granted asylum";
							body = "Due to NSA incompetence, the whistle-blower was stranded after flight scheduling computer databases where hacked by the lack-luster American intelligence agency, sources say.";
							break;
						default:
							win |= snowden;
							gameOver |= snowden;
							subject = "is apprehended";
							body = "The NSA orchestrated a world-wide manhunt that resulted in the cornering of the fugitive in a friendly airport with incorrect travel documents, sources say.";
							break;
						}
						sendMessage({tasks:[{type:"addMessage",message:{
							from:"Open_Source_Intel@nsa.gov",
							subject:target.fugitive.firstname+" "+target.fugitive.lastname+" "+subject+" in "+airport.country+"!",
							body:"<p><i>Source:</i> International Newspapers, all channels</p>"+
								"<p><i>Alias:</i> "+target.firstname+" "+target.lastname+" "+target.pass+
								"<p>"+body+"</p>",
							zIndex:snowden?1000006:0,
						}}],});
						if(gameOver)
							sendMessage({cmd:"stop",win:win});
					} else if(target.watchlist) {
						sendMessage({tasks:[{type:"addMessage",message:{
							from:"Open_Source_Intel@nsa.gov",
							subject:target.firstname+" "+target.lastname+" stranded in "+airport.country+"!",
							body:"<p><i>Source:</i> International Newspapers, all channels</p>"+
								"<p>A disappointed well-known activist was left fuming at airport security today after a computer mishap!</p>",
						}}],});
					}
					removed.push(pass);
				}
			}
			flight.passengers = {};
			for(var entry in manifest) {
				entry = manifest[entry];
				var	target = targets[entry.pass],
					passenger = find(tableData.targets,"pass",entry.pass);
				if(target) {
					if(target.airport != flight.depart) {
						entry.remark = "missed";
						missed.push(entry.pass);
						continue;
					}
					target.airport = null;
				}
				if(entry.pass in flight.passengers) {
					entry.remark = "double booked!";
					doubleBooked.push(entry.pass);
				} else if(!target) {
					entry.remark = "missed";
					missed.push(entry.pass);
				} else if(!passenger || !strEq(passenger.firstname,target.firstname) || !strEq(passenger.lastname,target.lastname) || !strEq(passenger.gender,target.gender)) {
					console.log(flight.code,"DETAINING",entry.pass,JSON.stringify(target),JSON.stringify(passenger));
					entry.remark = "detained";
					if(passenger)
						passenger.remark = "detained";
					if(target.agent) {
						giveAgentOptions(target,false,true,flight.depart,"Some idiot broke the computer system and "+
							(passenger?"changed my details so they didn't match the passport I was carrying!":"removed me from the global passports database!")+
							"</p><p>Just you wait until I get out of jail!  I'm going to hunt that idiot down.  They will be <i>impacted</i>.");
					} else if(target.fugitive) {
						var snowden = strEq(target.fugitive.lastname,"snowden");
						var airport = airports[flight.depart];
						gameOver |= snowden;
						var subject, body;
						switch(airport.category) {
						case "Hostile":
							subject = "reaches safe haven";
							body = "Due to NSA incompetence, the whistle-blower was stranded after flight scheduling computer databases where hacked by the lack-luster American intelligence agency, sources say.";
							break;
						case "Neutral":
							subject = "is granted asylum";
							body = "Due to NSA incompetence, the whistle-blower was stranded after flight scheduling computer databases where hacked by the lack-luster American intelligence agency, sources say.";
							break;
						default:
							win = snowden;
							subject = "is apprehended";
							body = "The NSA orchestrated a world-wide manhunt that resulted in the cornering of the fugitive in a friendly airport with incorrect travel documents, sources say.";
							break;
						}
						sendMessage({tasks:[{type:"addMessage",message:{
							from:"Open_Source_Intel@nsa.gov",
							subject:target.fugitive.firstname+" "+target.fugitive.lastname+" "+subject+" in "+airport.country+"!",
							body:"<p><i>Source:</i> International Newspapers, all channels</p>"+
								"<p><i>Alias:</i> "+target.firstname+" "+target.lastname+" "+target.pass+
								"<p>"+body+"</p>",
							zIndex:snowden?1000006:0,
						}}],});

					}
					detained.push(entry.pass);
				} else {
					flight.passengers[passenger.pass] = 1;
					entry.remark = "boarded";
				}
			}
			if(removed.length)
				console.log(flight.code,"removed",removed);
			if(doubleBooked.length)
				console.log(flight.code,"double booked",doubleBooked);
			if(missed.length)
				console.log(flight.code,"missed",missed);
			if(detained.length)
				console.log(flight.code,"detained",detained);
		} else {
			var detained = [], agents = [], fugitives = [], watched = [], landed = [];
			for(var pass in passengers) {
				var	target = targets[pass],
					passenger = find(tableData.targets,"pass",pass),
					entry = find(manifest,"pass",pass);
				if(entry && passenger && strEq(passenger.firstname,target.firstname) && strEq(passenger.lastname,target.lastname) && strEq(passenger.gender,target.gender)) {
					target.airport = flight.arrive;
					entry.remark = "landed";
					if(target.agent)
						agents.push(target);
					else if(target.fugitive)
						fugitives.push(target);
					else if(target.watchlist)
						watched.push(target);
					else
						landed.push(passenger);
				} else {
					console.log(flight.code,"DETAINING",pass,JSON.stringify(target),JSON.stringify(passenger));
					if(target.agent)
						giveAgentOptions(target,false,true,flight.arrive,"Some idiot broke the computer system and "+
							(passenger?"changed my details so they didn't match the passport I was carrying!":"removed me from the database!")+
							"</p><p>Just you wait until I get out of jail!  I'm going to hunt that idiot down.  They will be <i>impacted</i>.");
					if(entry)
						entry.remark = "detained";
					if(passenger)
						passenger.remark = "detained";
					detained.push(pass);
				}
			}
			if(detained.length)
				console.log(flight.code,"detained",detained);
			if(agents.length) {
				if(landed.length)
					console.log("VETTED",landed.length);
				for(var target in landed)
					landed[target].remark = "vetted";
				var report = "<p>"+landed.length+" targets vetted out ok.</p>";
				for(var target in fugitives) {
					target = fugitives[target];
					report += "<h3>I have located "+target.fugitive.firstname+" "+target.fugitive.lastname+" traveling as "+target.pass+" "+target.firstname+" "+target.lastname+"!</h3><p>I have handed him over to the local CIA Resident.</p>";
					target.airport = null;
					var snowden = strEq(target.fugitive.lastname,"snowden");
					win |= snowden;
					gameOver |= snowden;
				}
				for(var target in watched) {
					target = watched[target];
					report += "<p>"+target.firstname+" "+target.lastname+" was on the flight.</p>";
				}
				for(var agent in agents) {
					giveAgentOptions(agents[agent],true,false,flight.arrive,report+(gameOver?"":"<p>Where do you want me to go now?"));
					report = null;
				}
			}
			if(!gameOver && fugitives.length) {
				for(target in fugitives) {
					target = fugitives[target];
					var snowden = strEq(target.fugitive.lastname,"snowden");
					console.log("fugitive",target.fugitive.lastname,"reaches freedom!");
					if(target.journey[target.journey.length-1].code == flight.code) {
						sendMessage({tasks:[{type:"addMessage",message:{
							from:"Open_Source_Intel@nsa.gov",
							subject:target.fugitive.firstname+" "+target.fugitive.lastname+" reaches safe haven in "+airports[flight.arrive].country+"!",
							body:"<p><i>Source:</i> International Newspapers, all channels</p>"+
								"<p><i>Alias:</i> "+target.firstname+" "+target.lastname+" "+target.pass,
							zIndex:snowden?1000006:0,
						}}],});
						gameOver = snowden;
						if(gameOver)
							sendMessage({cmd:"stop",win:win});
					}
				}
			}
		}
		return true;
	}
	
	schedule();
}
