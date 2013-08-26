
function IFCU() {
	CanvasFrame.call(this,{
		title:"International Flight Control Uplink",
		icon:"icon_plane.png",
		width:640, height:480,
		resize:true, show:true,
		maximise:true, minimise:true, close:true, startMenu:true,
		backgroundColor: [0,0,0,1],
		animate:true, trackMouse:true,
	});
	this.inFlight = {};
	this.errors = 0;
}
IFCU.prototype = {
	__proto__: CanvasFrame.prototype,
	draw: function() {
		var	canvas = this.canvas,
			ctx = canvas.getContext("2d"),
			map = document.getElementById("WorldMap"),
			scale = Math.min(canvas.width/map.width,canvas.height/map.height),
			xOrigin = (canvas.width-map.width*scale)/2,
			yOrigin = (canvas.height-map.height*scale)/2;
		ctx.drawImage(map,0,0,map.width,map.height,xOrigin,yOrigin,map.width*scale,map.height*scale);
		var now = gameTime()-zeroHour;
		ctx.strokeStyle = "cyan";
		ctx.fillStyle = "white";	
		for(var airport in this.airports) {
			airport = this.airports[airport];
			ctx.beginPath();
			ctx.arc(airport[0]*scale+xOrigin,airport[1]*scale+yOrigin,4,2*Math.PI,false);
			ctx.stroke();
		}
		for(var flight in this.inFlight) {
			flight = this.inFlight[flight];
			var	from = this.airports[flight.depart],
				to = this.airports[flight.arrive],
				t = Math.min(Math.max((now-flight.departure)/(flight.arrival-flight.departure),0),1),
				pos = flight.mapPos = [from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t];
			ctx.strokeStyle = "#eee";
			ctx.fillStyle = "white";
			ctx.beginPath();
			ctx.moveTo(from[0]*scale+xOrigin,from[1]*scale+yOrigin);
			ctx.lineTo(pos[0]*scale+xOrigin,pos[1]*scale+yOrigin);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(from[0]*scale+xOrigin,from[1]*scale+yOrigin,2,2*Math.PI,false);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(to[0]*scale+xOrigin,to[1]*scale+yOrigin,2,2*Math.PI,false);
			ctx.fill();
			ctx.fillStyle = "red";
			ctx.strokeStyle = "orange";
			ctx.beginPath();
			ctx.moveTo(pos[0]*scale+xOrigin,pos[1]*scale+yOrigin);
			ctx.lineTo(to[0]*scale+xOrigin,to[1]*scale+yOrigin);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(pos[0]*scale+xOrigin,pos[1]*scale+yOrigin,2,2*Math.PI,false);
			ctx.fill();
		}
		if(this.mousePos) {
			var tip, best, minDist = 6, tipPos, p, d, sqr = function(x) { return x*x; };
			for(var flight in this.inFlight) {
				p = this.inFlight[flight].mapPos;
				p = [p[0]*scale+xOrigin,p[1]*scale+yOrigin];
				d = Math.sqrt(sqr(this.mousePos[0]-p[0])+sqr(this.mousePos[1]-p[1]));
				if(d < minDist && (!tip || d < best)) {
					best = d;
					tipPos = p;
					tip = flight;
				}
			}
			if(!tip) {
				for(var airport in this.airports) {
					p = this.airports[airport];
					p = [p[0]*scale+xOrigin,p[1]*scale+yOrigin];
					d = Math.sqrt(sqr(this.mousePos[0]-p[0])+sqr(this.mousePos[1]-p[1]));
					if(d < minDist && (!tip || d < best)) {
						best = d;
						tipPos = p;
						tip = airport;
					}
				}
			}
			if(tip) {
				ctx.strokeStyle = "red";
				ctx.beginPath();
				ctx.arc(tipPos[0],tipPos[1],4,2*Math.PI,false);
				ctx.stroke();
				ctx.fillStyle = "beige";
				var w = ctx.measureText(tip).width+8, h = 18;
				roundedRect(ctx,tipPos[0]+10,tipPos[1]+10,w,h,3,true,true);
				ctx.fillStyle = "red";
				ctx.font = '8pt Sans Serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.fillText(tip,tipPos[0]+14.5,tipPos[1]+12);
			}
		}
	},
	onMessage: function(data) {
		var dir = data.dir, flight = data.flight;
		if(dir == "depart") {
			this.inFlight[flight.code] = flight;
		} else if(dir == "arrive") {
			delete this.inFlight[flight.code];
		} else
			fail("unsupported dir: "+dir);
	},
	airports: {
		LHR:[295,159],
		CDG:[300,175],
		HKG:[503,236],
		DXB:[392,239],
		AMS:[303,158],
		FRA:[311,162],
		SIN:[484,304],
		ICN:[513,199],
		JFK:[169,199],
		ZRH:[310,176],
		MIA:[158,232],
		DME:[387,119],
		FNJ:[512,193],
		HAV:[164,250],
		CCS:[210,308],
		UIO:[157,315],
		VVI:[198,345],
		AKL:[594,444],
		SYD:[558,407],
		PER:[497,400],
		CGK:[488,326],
		SCL:[175,390],
		GRU:[217,370],
		LAX:[ 98,200],
		MAD:[287,198],
		MUC:[319,172],
		CPH:[313,146],
		PEK:[487,191],
	},
};

function roundedRect(ctx,x,y,width,height,radius,fill,stroke){
	if(typeof stroke == "undefined") stroke = true;
	if(typeof radius === "undefined") radius = 5;
	ctx.beginPath();
	ctx.moveTo(x+radius,y);
	ctx.lineTo(x+width-radius,y);
	ctx.quadraticCurveTo(x+width,y,x+width,y+radius);
	ctx.lineTo(x+width,y+height-radius);
	ctx.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
	ctx.lineTo(x+radius,y+height);
	ctx.quadraticCurveTo(x,y+height,x,y+height-radius);
	ctx.lineTo(x,y+radius);
	ctx.quadraticCurveTo(x,y,x+radius,y);
	ctx.closePath();
	if(stroke) ctx.stroke();
	if(fill) ctx.fill();
}
