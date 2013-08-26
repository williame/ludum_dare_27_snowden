
function choose(array) {
	assert(array);
	return array.length? array[Math.floor(Math.random()*array.length)]: null;
}

function find(array,key,value) {
	assert(array);
	assert(key);
	value = String(value).toUpperCase();
	var matching = array.filter(function(obj) { return String(obj[key]).toUpperCase() == value; });
	if(matching.length == 0) {
		console.log("(could not find "+key+"="+value+")");
		return null;
	}
	if(matching.length == 1)
		return matching[0];
	return choose(matching);
}

function strEq(a,b) { return String(a).toUpperCase() == String(b).toUpperCase(); }

function roulette(counts) {
	var sum = 0;
	for(var i in counts)
		sum += counts[i];
	var rnd = Math.floor(Math.random()*sum);
	for(var i in counts) {
		if(counts[i] > rnd)
			return i;
		rnd -= counts[i];
	}
	assert("bad roulette");
	return 0;
}

function shuffle(array) {
    for(var j, x, i = array.length; i; j = Math.floor(Math.random() * i), x = array[--i], array[i] = array[j], array[j] = x);
    return array;
}

function doubleDigits(digits) {
	digits = String(parseInt(digits));
	return digits.length == 1? "0"+digits: digits;
}

function dateString(millis) {
	var date = new Date(millis);
	return date.getFullYear()+"-"+doubleDigits(date.getMonth()+1)+"-"+doubleDigits(date.getDate())+" "+
		doubleDigits(date.getHours())+":"+doubleDigits(date.getMinutes());
}

function durationString(millis) {
	var	seconds = millis/1000,
		minutes = seconds/60,
		hours = minutes/60;
	return parseInt(hours)+":"+doubleDigits(minutes%60);
}

function Flight(code,from,to,departure,airline,aircraft,creator) {
	assert(this instanceof Flight);
	this.from = from;
	this.to = to;
	this.departure = departure;
	var	distance = parseInt(computeDistance(lngLatToVec3(from.lng,from.lat),lngLatToVec3(to.lng,to.lat))/1000),
		duration = distance/aircraft.avg_speed*60*60*1000;
	this.arrival = departure+duration;
	this.creator = creator;
	this.passengers = {};
	// fields for SQL querying
	this.code = code;
	this.airline = airline.code;
	this.depart = from.code;
	this.arrive = to.code;
	this.aircraft = aircraft.name;
	this.distance = distance;
	this.departure_time = null;
	this.duration = durationString(duration);
	this.arrival_time = null;
}

function generateGame(zeroHour) {

	function clone(obj,def) {
		assert(def);
		var ret = {};
		for(var col in def)
			ret[col] = obj[col];
		return ret;
	}
	
	var i, j;

	var	hubs = {}, routes = {};
	for(var route in tableData.routes) {
		route = tableData.routes[route];
		if(route.relationship == "Hub") {
			assert(!(route.airline in hubs),route);
			hubs[route.airline] = route.airport;
		} else {
			assert(route.airline in hubs,route);
			var from = route.airport, to = hubs[route.airline];
			if(!(from in routes))
				routes[from] = {};
			routes[from][to] = true;
			if(!(to in routes))
				routes[to] = {};
			routes[to][from] = true;
		}
	}
	
	// score airports by how many hops they are from a Hostile endpoint
	var open = new PriorityQueue(false);
	for(var airport in tableData.airports) {
		airport = tableData.airports[airport];
		airports[airport.code] = airport;
		if(airport.category == "Hostile")
			open.push([1,airport]);
	}
	while(open.size()) {
		var top = open.pop(), score = top[0], airport = top[1];
		if(airport.score < score) continue;
		airport.score = score++;
		for(var route in routes[airport.code])
			open.push([score,airports[route]]);
	}

	var	visits = {},
		randomInt = function(max,min) {
			min = min||0;
			return Math.floor(Math.random()*(max-min))+min;
		},
		generatePass = function(nationality) {
			do var pass = nationality+randomInt(10000);
			while(pass in targets);
			return pass;
		},
		createFollower = function(airport) {
			var	nationality = choose(tableData.nations).code,
				firstname = choose(tableData.firstnames),
				lastname = choose(tableData.lastnames).lastname,
				pass = generatePass(nationality),
				target = targets[pass] = {
					pass:pass,
					nationality:nationality,
					firstname:firstname.firstname,
					lastname: lastname,
					gender:firstname.gender,
					remark:'',
					airport:airport,
					journey:[],
				};
			tableData.targets.push(clone(target,tableDefs.targets));
			return target;
		},
		generateFlights = function(from,at,pass,fugitive) {
			var visited = {}; visited[from] = true;
			var journey = [];
			for(var hops=randomInt(10,fugitive?7:4); hops --> 0; ) {
				if(!(from in visits))
					visits[from] = 1;
				else
					visits[from]++;
				var	wait = randomInt(20*60,1*60)*60*1000,
					flight = choose(tableData.flights.filter(function(obj) {
						return	obj.depart == from &&
							obj.departure >= at && obj.departure < at+wait; }));
				if(!flight) {
					var destScores = {};
					for(var route in routes[from]) {
						if((route == "HAV" || route == "FNJ") && !fugitive)
							continue;
						if(route in visits && !(route in visited))
							destScores[route] = visits[route]*10;
						else
							destScores[route] = 10-airports[route].score;
					}
					var	arrive = roulette(destScores),
						route = find(tableData.routes,"airport",arrive),
						airline = find(tableData.airlines,"code",route.airline),
						aircraft = find(tableData.aircraft,"name",choose(tableData.routes.filter(function(obj) { return obj.aircraft && obj.airline == route.airline && (obj.airport == arrive || arrive == hubs[obj.airline]); })).aircraft);
					do flight = airline.code+"-"+doubleDigits(randomInt(2000));
					while(flight in flights);
					flights[flight] = new Flight(flight,airports[from],airports[arrive],
						at+randomInt(3*60,1*60)*60*1000,
						airline,aircraft,pass);
					tableData.flights.push(flights[flight]);
					visited[to.code] = true;
					flight = flights[flight];
				}
				journey.push(flight);
				from = flight.arrive;
				at = flight.arrival;
				if(from == "HAV" || from == "FNJ")
					break;
				if(fugitive && airports[from].category == "Hostile" && journey.length > 5)
					break;
			}
			return journey;
		};
	// add all the watchlisters to the target list
	for(var target in tableData.watchlist) {
		target = tableData.watchlist[target];
		var pass = target.pass = target.effective_pass = generatePass(target.nationality);
		var fugitive = target.uses_aliases == "Y";
		target = targets[pass] = {
			pass:pass,
			nationality:target.nationality,
			firstname:target.firstname,
			lastname: target.lastname,
			gender:target.gender,
			remark:"on watchlist",
			airport:target.start,
			watchlist:true,
		};
		tableData.targets.push(clone(target,tableDefs.targets));
		if(fugitive) {
			var	firstname = choose(tableData.firstnames.filter(function(obj) { return obj.gender == target.gender; })),
				lastname = choose(tableData.lastnames).lastname,
				nationality = choose(tableData.nations).code,
				pass = generatePass(nationality);
			target.effective_pass = pass;
			target = targets[pass] = {
				pass:pass,
				nationality:nationality,
				firstname:firstname.firstname,
				lastname:lastname,
				gender:firstname.gender,
				remark:"",
				airport:target.airport,
				fugitive:target,
			};
			tableData.targets.push(clone(target,tableDefs.targets));
		}
		var journey, tries = 0;
		do {
			if(journey) {
				for(var flight in journey) {
					flight = journey[flight];
					if(flight.creator == pass) {
						delete flights[flight.code];
						tableData.flights.splice(tableData.flights.indexOf(flights[flight]),1);
					}
				}
			}
			journey = generateFlights(target.airport,zeroHour+randomInt(2*60)*60*1000,pass,fugitive);
		} while(fugitive && airports[journey[journey.length-1].arrive].category != "Hostile");
		target.journey = journey;
		if(fugitive) console.log("target",target.pass,"took "+tries+" tries");
		for(var flight in journey) {
			flight = journey[flight];
			flight.passengers[pass] = 1;
			tableData.manifests.push({
				flight:flight.code,
				pass:pass,
				remark:"",
			});
		}
		// add some people to follow along and fill the flights up
		var followers = [], idealNumFollowers = randomInt(10,6);
		for(i=idealNumFollowers; i --> 0; )
			followers.push(createFollower(target.airport));
		for(var flight in journey) {
			flight = journey[flight];
			for(i=Math.floor((idealNumFollowers-followers.length)*0.1); i-->0; )
				followers.push(createFollower(flight.depart));
			for(var follower in followers) {
				follower = followers[follower];
				follower.journey.push(flight.code);
				flight.passengers[follower.pass] = 1;
				tableData.manifests.push({
					flight:flight.code,
					pass:follower.pass,
					remark:"",
				});
			}
			for(i=Math.floor(followers.length*Math.random()*0.1); i-->0; )
				followers.splice(randomInt(followers.length),0);
		}
	}
	// make two agents
	for(i=0; i<2; i++) {
		firstname = choose(tableData.firstnames);
		lastname = choose(tableData.lastnames).lastname;
		target = {
			pass:generatePass("US"),
			nationality:"US",
			firstname:firstname.firstname,
			lastname:lastname,
			gender:firstname.gender,
			remark:"Secret Agent",
			airport:choose(tableData.watchlist.filter(function(obj) { return obj.uses_aliases=="N"; })).start,
			agent:true,
		};
		targets[target.pass] = target;
		tableData.targets.push(clone(target,tableDefs.targets));
		agents.push(target);
	}
	
	shuffle(tableData.targets);
}

// ---- BinaryHeap from http://eloquentjavascript.net/appendix2.html ----
// found this to work massively faster than my feeble attempts to write one
function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to bubble up.
    this.bubbleUp(this.content.length - 1);
  },

  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.sinkDown(0);
    }
    return result;
  },

  remove: function(node) {
    var length = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (var i = 0; i < length; i++) {
      if (this.content[i] != node) continue;
      // When it is found, the process seen in 'pop' is repeated
      // to fill up the hole.
      var end = this.content.pop();
      // If the element we popped was the one we needed to remove,
      // we're done.
      if (i == length - 1) break;
      // Otherwise, we replace the removed element with the popped
      // one, and allow it to float up or sink down as appropriate.
      this.content[i] = end;
      this.bubbleUp(i);
      this.sinkDown(i);
      break;
    }
  },

  size: function() {
    return this.content.length;
  },

  bubbleUp: function(n) {
    // Fetch the element that has to be moved.
    var element = this.content[n], score = this.scoreFunction(element);
    // When at 0, an element can not go up any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      var parentN = Math.floor((n + 1) / 2) - 1,
      parent = this.content[parentN];
      // If the parent has a lesser score, things are in order and we
      // are done.
      if (score >= this.scoreFunction(parent))
        break;

      // Otherwise, swap the parent with the current element and
      // continue.
      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  },

  sinkDown: function(n) {
    // Look up the target element and its score.
    var length = this.content.length,
    element = this.content[n],
    elemScore = this.scoreFunction(element);

    while(true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) * 2, child1N = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      var swap = null;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N],
        child1Score = this.scoreFunction(child1);
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore)
          swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N],
        child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score))
          swap = child2N;
      }

      // No need to swap further, we are done.
      if (swap == null) break;

      // Otherwise, swap and continue.
      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
};

function PriorityQueue(asc) {
	BinaryHeap.call(this,asc?this.cmpAsc:this.cmpDesc);
}
PriorityQueue.prototype = {
	__proto__: BinaryHeap.prototype,
	cmpDesc: function cmpDesc(element) {
		return element[0];
	},
	cmpAsc: function(element) {
		return -element[0];
	},
};
