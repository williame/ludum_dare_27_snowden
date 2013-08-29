function now() { return (new Date()).getTime(); }

var	zeroHour = 0,
	gameSpeed = 300; //### 60 for release

function gameTime() { return parseInt(zeroHour+(now()-zeroHour)*gameSpeed); }

var deg2rad = Math.PI/180;

function lngLatToVec3(lng,lat) {
	lng *= deg2rad;
	lat *= deg2rad;
	var	cosLat = Math.cos(lat), cosLng = Math.cos(lng),
		sinLat = Math.sin(lat), sinLng = Math.cos(lng);
	return [-cosLat*cosLng,sinLat,cosLat*sinLng];
}

function vec3ToLngLat(v) { // unit sphere point in, radians out
	return [Math.PI/2+Math.atan2(v[2],v[0]),Math.atan2(v[1],Math.sqrt(v[0]*v[0],v[2]*v[2]))];
}

function computeDistance(from,to) { // radians in, metres out.  untested
	from = vec3ToLngLat(from);
	to = vec3ToLngLat(to);
	return Math.acos(Math.sin(from[1])*Math.sin(to[1]) + 
		Math.cos(from[1])*Math.cos(to[1]) *
		Math.cos(to[0]-from[0])) * 6370986;
}

function computeBearing(lng1,lat1,lng2,lat2) { // radians in and out.  untested
	var	y = Math.sin(lon2-lon1)*Math.cos(lat2),
		x = Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	return Math.atan2(y,x);
}

function loadTSV(tableName,columnNames,rows) {
	var ret = [];
	var tableDef = secretTableDefs[tableName];
	rows = rows.split("\n");
	for(var row in rows) {
		row = rows[row].split("\t");
		var obj = {};
		for(var col in tableDef)
			obj[col] = null;
		for(var col in columnNames)
			obj[columnNames[col]] = row[col];
		ret.push(obj);
	}
	var check = {};
	check[tableName] = ret;
	check = SQL("check "+tableName+";",secretTableDefs,{},check).rows[0]; // check constraints
	if(!check[1]) fail(check[2]);
	return ret;
}

var	playerName = null,
	tableDefs = {
		airports: {
			code:{description:"IATA code",},
			name:{},
			country:{},
			category:{description:"level of CIA infiltration",},
			lat:{description:"latitude (decimal degrees)",},
			lng:{description:"longitude (decimal degrees)",},
		},
		airlines: {
			code:{},
			name:{},
			country:{},
		},
		aircraft: {
			name: {},
			maker: {},
			max_passengers: {},
			max_range: {description:"km"},
			avg_speed: {description:"kph"},
			cruising_alt: {description:"ft"},
		},
		watchlist: {
			gender:{notNull:true},
			firstname:{notNull:true},
			lastname:{notNull:true},
			pass:{description:"passport number"},
			category:{description:"reason for interest"},
			organisation:{},
			status:{description:"have we got them yet?"},
			date_of_birth:{},
			occupation:{},
			nationality:{},
			country_of_birth:{notNull:true},
			residence:{},
		},
		flights: {
			code:{description:"flight number"},
			depart:{description:"code for departure airport"},
			arrive:{description:"code for arrival airport"},
			aircraft:{description:"name of aircraft type"},
			airline:{description:"code of airline carrier"},
			distance:{description:"km"},
			departure_time:{},
			arrival_time:{},
			duration:{},
		},
		manifests: {
			flight:{description:"flight code",notNull:true,},
			pass:{description:"passenger's passport number",notNull:true,},
			remark:{description:"notes for the booking agent"},
		},
		targets: {
			pass:{description:"passport number"},
			nationality:{},
			firstname:{},
			lastname:{},
			gender:{},
			remark:{description:"notes for the secret agent"},
		},
		nations: {
			name:{notNull:true},
			code:{notNull:true},
		},
	},
	secretTableDefs = {
		__proto__: tableDefs,
		watchlist: {
			__proto__: tableDefs.watchlist,
			npc_id: {},
			start: {},
			uses_aliases: {},
		},
		routes: {
			airline:{notNull:true},
			airport:{notNull:true},
			relationship:{},
			aircraft:{},
		},
		firstnames: {
			firstname:{notNull:true},
			gender:{notNull:true},
		},
		lastnames: {
			lastname:{notNull:true},
		},
	},
	tableAccess = {
		targets: true,
		watchlist: true,
		manifests: true,
	},
	tableData = {
		airports: loadTSV("airports",["code","name","country","category","lat","lng"],
			"LHR	London Heathrow	United Kingdom	Friendly	51.472332	-0.45088\n"+
			"CDG	Paris Charles deGaulle	France	Neutral	49.014342	2.541671\n"+
			"HKG	Hong Kong Int	Hong Kong	Neutral	22.307348	113.92546\n"+
			"DXB	Dubai Int	Dubai	Neutral	25.253004	55.362132\n"+
			"AMS	Amsterdam Schipol	Netherlands	Neutral	52.312422	4.774029\n"+
			"FRA	Frankfurt	Germany	Neutral	50.040062	8.55541\n"+
			"SIN	Singapore Changi	Singapore	Neutral	1.351854	103.984098\n"+
			"ICN	Incheon	South Korea	Friendly	37.4568	126.446097\n"+
			"JFK	John F Kennedy	United States	Friendly	40.643687	73.790932\n"+
			"ZRH	Zurich	Switzerland	Neutral	47.452174	8.56276\n"+
			"MIA	Miami	United States	Friendly	25.795447	-80.27798\n"+
			"DME	Moscow Domodedovo	Russia	Hostile	55.411301	37.900523\n"+
			"FNJ	Pyongyang Sunan	North Korea	Hostile	39.202468	125.674186\n"+
			"HAV	Havana Jose Marti	Cuba	Hostile	22.995328	-82.408188\n"+
			"CCS	Caracus Simon Bolivar	Venezeula	Hostile	10.597898	-67.005875\n"+
			"UIO	Mariscal Sucre	Ecuador	Hostile	-0.128287	-78.358156\n"+
			"VVI	Viru Viru	Bolivia	Neutral	-17.647125	-63.13664\n"+
			"AKL	Aukland	New Zealand	Neutral	-37.007757	174.790305\n"+
			"SYD	Sydney	Australia	Neutral	-33.948879	151.180891\n"+
			"PER	Perth	Australia	Neutral	-31.952717	115.971072\n"+
			"CGK	Soekarno-Hatta Int	Indonesia	Neutral	-6.131372	106.655505\n"+
			"SCL	Comodoro Arturo Merino Benitez Int	Chile	Neutral	-33.392179	-70.797589\n"+
			"GRU	Sao Paulo-Guarulhos	Brasil	Neutral	-23.431002	-46.480252\n"+
			"LAX	los Angeles Int	United States	Friendly	33.93965	-118.404855\n"+
			"MAD	Madrid-Barajas	Spain	Neutral	40.468305	-3.57104\n"+
			"MUC	Munich	Germany	Neutral	48.355942	11.786468\n"+
			"CPH	Copenhagen	Denmark	Neutral	55.6262	12.653028\n"+
			"PEK	Bejing Capitol Int	China	Neutral	40.08	116.584444"),
		airlines: loadTSV("airlines",["code","name","country"],
			"SU	Aeroflot	Russia\n"+
			"AF	Air France	France\n"+
			"AC	Air China	China\n"+
			"CX	Cathay Pacific	China\n"+
			"DL	Delta Airlines	USA\n"+
			"KE	Korean Air	South Korea\n"+
			"LX	Swiss	Switzerland\n"+
			"US	US Airways	USA\n"+
			"UA	United Airlines	USA\n"+
			"SK	SAS	Denmark\n"+
			"EK	Emirates	UAE\n"+
			"SQ	Singapore Airlines	Singapore\n"+
			"BA	British Airways	UK\n"+
			"VS	Virgin Atlantic	UK\n"+
			"JS	Air Koryo	North Korea\n"+
			"AA	American Airlines	USA\n"+
			"LH	Lufthansa	Germany\n"+
			"IB	Iberia	Spain\n"+
			"LA	LAN	Brasil\n"+
			"QF	Quantas	Australia\n"+
			"CU	Cubana	Cuba"),
		aircraft: loadTSV("aircraft",["name","maker","max_passengers","max_range","avg_speed","cruising_alt"],
			"Tu-204	Tupolev	175	4300	810	30000\n"+
			"B-777	Boeing	451	15000	905	37000\n"+
			"B-747	Boeing	524	15000	913	37000\n"+
			"B-787	Boeing	280	15000	913	32000\n"+
			"A330	Airbus	335	13000	871	36000\n"+
			"A340	Airbus	380	17000	871	34000\n"+
			"A380	Airbus	644	15000	910	40000\n"+
			"Il-96	Illyushin	340	12000	870	35000\n"+
			"A319	Airbus	124	6700	828	30000\n"+
			"B-737	Boeing	102	4300	828	30000\n"+
			"B-767	Boeing	269	11000	851	34000"),
		flights: [],
		manifests: [],
		targets: [],
		routes: loadTSV("routes",
			["airline","airport","relationship","aircraft"],
			"SU	DME	Hub	\n"+
			"SU	LHR	Destination	Il-96\n"+
			"SU	CDG	Destination	B-777\n"+
			"SU	DXB	Destination	A330\n"+
			"SU	AMS	Destination	Il-96\n"+
			"SU	FRA	Destination	B-777\n"+
			"SU	ICN	Destination	B-777\n"+
			"SU	JFK	Destination	B-777\n"+
			"AF	CDG	Hub	\n"+
			"AF	LHR	Destination	A319\n"+
			"AF	DXB	Destination	B-777\n"+
			"AF	AMS	Destination	A319\n"+
			"AF	FRA	Destination	A319\n"+
			"AF	JFK	Destination	B-747\n"+
			"AF	ZRH	Destination	A319\n"+
			"AF	MIA	Destination	A340\n"+
			"AF	CCS	Destination	A340\n"+
			"AF	GRU	Destination	A330\n"+
			"AF	MAD	Destination	A319\n"+
			"AA	JFK	Hub	\n"+
			"AA	LHR	Destination	B-777\n"+
			"AA	CDG	Destination	B-777\n"+
			"AA	AMS	Destination	B-747\n"+
			"AA	ZRH	Destination	B-777\n"+
			"AA	MIA	Destination	B-787\n"+
			"AA	LAX	Destination	B-777\n"+
			"AA	CPH	Destination	B-747\n"+
			"AC	PEK	Hub	\n"+
			"AC	HKG	Destination	B-737\n"+
			"AC	FRA	Destination	B-777\n"+
			"AC	SIN	Destination	B-777\n"+
			"AC	ICN	Destination	B-737\n"+
			"AC	DME	Destination	A330\n"+
			"AC	FNJ	Destination	B-737\n"+
			"AC	CGK	Destination	A330\n"+
			"AC	GRU	Destination	A340\n"+
			"CX	HKG	Hub	\n"+
			"CX	LHR	Destination	B-747\n"+
			"CX	CDG	Destination	A340\n"+
			"CX	SIN	Destination	A330\n"+
			"CX	PEK	Destination	B-767\n"+
			"CX	ICN	Destination	A330\n"+
			"CX	PER	Destination	A340\n"+
			"CX	CGK	Destination	A330\n"+
			"CX	LAX	Destination	B-747\n"+
			"DL	JFK	Hub	\n"+
			"DL	AMS	Destination	B-777\n"+
			"DL	MIA	Destination	B-767\n"+
			"DL	SCL	Destination	B-777\n"+
			"DL	GRU	Destination	B-777\n"+
			"DL	LAX	Destination	B-767\n"+
			"KE	ICN	Hub	\n"+
			"KE	CDG	Destination	A380\n"+
			"KE	ZRH	Destination	B-777\n"+
			"KE	AKL	Destination	B-777\n"+
			"KE	SYD	Destination	A380\n"+
			"KE	CGK	Destination	A330\n"+
			"KE	LAX	Destination	B-747\n"+
			"LX	ZRH	Hub	\n"+
			"LX	LHR	Destination	A319\n"+
			"LX	CDG	Destination	A319\n"+
			"LX	FRA	Destination	A319\n"+
			"LX	JFK	Destination	A340\n"+
			"LX	MIA	Destination	A330\n"+
			"LX	MAD	Destination	A319\n"+
			"LX	MUC	Destination	A319\n"+
			"LX	CPH	Destination	A319\n"+
			"US	LAX	Hub	\n"+
			"US	HKG	Destination	B-777\n"+
			"US	JFK	Destination	B-767\n"+
			"US	MIA	Destination	B-767\n"+
			"US	UIO	Destination	B-777\n"+
			"UA	MIA	Hub	\n"+
			"UA	AMS	Destination	B-747\n"+
			"UA	CCS	Destination	B-777\n"+
			"UA	SCL	Destination	B-777\n"+
			"UA	GRU	Destination	B-747\n"+
			"UA	MAD	Destination	B-777\n"+
			"SK	CPH	Hub	\n"+
			"SK	LHR	Destination	B-737\n"+
			"SK	CDG	Destination	B-737\n"+
			"SK	FRA	Destination	B-737\n"+
			"SK	ZRH	Destination	B-737\n"+
			"SK	DME	Destination	B-737\n"+
			"SK	MAD	Destination	B-737\n"+
			"EK	DXB	Hub	\n"+
			"EK	LHR	Destination	B-777\n"+
			"EK	AMS	Destination	B-777\n"+
			"EK	JFK	Destination	A380\n"+
			"EK	ZRH	Destination	A340\n"+
			"EK	DME	Destination	A330\n"+
			"EK	GRU	Destination	A340\n"+
			"EK	MAD	Destination	A330\n"+
			"EK	MUC	Destination	B-777\n"+
			"EK	CPH	Destination	A330\n"+
			"EK	SIN	Destination	B-777\n"+
			"SQ	SIN	Hub	\n"+
			"SQ	LHR	Destination	A380\n"+
			"SQ	CDG	Destination	B-777\n"+
			"SQ	HKG	Destination	B-777\n"+
			"SQ	DXB	Destination	B-777\n"+
			"SQ	ICN	Destination	A330\n"+
			"SQ	ZRH	Destination	A380\n"+
			"SQ	AKL	Destination	A380\n"+
			"SQ	SYD	Destination	B-777\n"+
			"SQ	PER	Destination	B-777\n"+
			"SQ	CGK	Destination	A340\n"+
			"SQ	PEK	Destination	A340\n"+
			"BA	LHR	Hub	\n"+
			"BA	CDG	Destination	A319\n"+
			"BA	HKG	Destination	B-747\n"+
			"BA	DXB	Destination	B-777\n"+
			"BA	AMS	Destination	A319\n"+
			"BA	FRA	Destination	A319\n"+
			"BA	JFK	Destination	B-747\n"+
			"BA	ZRH	Destination	A319\n"+
			"BA	MIA	Destination	B-777\n"+
			"BA	GRU	Destination	B-777\n"+
			"BA	LAX	Destination	B-747\n"+
			"BA	MAD	Destination	B-767\n"+
			"BA	MUC	Destination	A319\n"+
			"BA	CPH	Destination	B-767\n"+
			"VS	LHR	Hub	\n"+
			"VS	JFK	Destination	A340\n"+
			"VS	MIA	Destination	A340\n"+
			"VS	LAX	Destination	A340\n"+
			"JS	FNJ	Hub	\n"+
			"JS	PEK	Destination	Tu-204\n"+
			"LH	FRA	Hub	\n"+
			"LH	LHR	Destination	B-737\n"+
			"LH	CDG	Destination	A319\n"+
			"LH	AMS	Destination	A319\n"+
			"LH	ICN	Destination	A340\n"+
			"LH	JFK	Destination	B-747\n"+
			"LH	ZRH	Destination	A319\n"+
			"LH	DME	Destination	A330\n"+
			"LH	MAD	Destination	A330\n"+
			"IB	MAD	Hub	\n"+
			"IB	CDG	Destination	A319\n"+
			"IB	AMS	Destination	A319\n"+
			"IB	MIA	Destination	A340\n"+
			"IB	CCS	Destination	A340\n"+
			"IB	GRU	Destination	A340\n"+
			"IB	CPH	Destination	A319\n"+
			"LA	GRU	Hub	\n"+
			"LA	HAV	Destination	B-767\n"+
			"LA	CCS	Destination	A319\n"+
			"LA	UIO	Destination	B-767\n"+
			"LA	AKL	Destination	A330\n"+
			"LA	SCL	Destination	B-767\n"+
			"QF	SYD	Hub	\n"+
			"QF	SIN	Destination	B-747\n"+
			"QF	AKL	Destination	B-747\n"+
			"QF	PER	Destination	B-747\n"+
			"QF	CGK	Destination	B-747\n"+
			"QF	SCL	Destination	B-747\n"+
			"CU	HAV	Hub	\n"+
			"CU	CCS	Destination	Il-96\n"+
			"CU	VVI	Destination	Il-96"),
		"firstnames": loadTSV("firstnames",["firstname","gender"],
			"AARON	Male\nABDUL	Male\nABE	Male\nABEL	Male\nABRAHAM	Male\nABRAM	Male\nADALBERTO	Male\nADAM	Male\nADAN	Male\nADOLFO	Male\nADOLPH	Male\nADRIAN	Male\nAGUSTIN	Male\nAHMAD	Male\nAHMED	Male\nAL	Male\nALAN	Male\nALBERT	Male\nALBERTO	Male\nALDEN	Male\nALDO	Male\nALEC	Male\nALEJANDRO	Male\nALEX	Male\nALEXANDER	Male\nALEXIS	Male\nALFONSO	Male\nALFONZO	Male\nALFRED	Male\nALFREDO	Male\nALI	Male\nALLAN	Male\nALLEN	Male\nALONSO	Male\nALONZO	Male\nALPHONSE	Male\nALPHONSO	Male\nALTON	Male\nALVA	Male\nALVARO	Male\nALVIN	Male\nAMADO	Male\nAMBROSE	Male\nAMOS	Male\nANDERSON	Male\nANDRE	Male\nANDREA	Male\nANDREAS	Male\nANDRES	Male\nANDREW	Male\nANDY	Male\nANGEL	Male\nANGELO	Male\nANIBAL	Male\nANTHONY	Male\nANTIONE	Male\nANTOINE	Male\nANTON	Male\nANTONE	Male\nANTONIA	Male\nANTONIO	Male\nANTONY	Male\nANTWAN	Male\nARCHIE	Male\nARDEN	Male\nARIEL	Male\nARLEN	Male\nARLIE	Male\nARMAND	Male\nARMANDO	Male\nARNOLD	Male\nARNOLDO	Male\nARNULFO	Male\nARON	Male\nARRON	Male\nART	Male\nARTHUR	Male\nARTURO	Male\nASA	Male\nASHLEY	Male\nAUBREY	Male\nAUGUST	Male\nAUGUSTINE	Male\nAUGUSTUS	Male\nAURELIO	Male\nAUSTIN	Male\nAVERY	Male\nBARNEY	Male\nBARRETT	Male\nBARRY	Male\nBART	Male\nBARTON	Male\nBASIL	Male\nBEAU	Male\nBEN	Male\nBENEDICT	Male\nBENITO	Male\nBENJAMIN	Male\nBENNETT	Male\nBENNIE	Male\nBENNY	Male\nBENTON	Male\nBERNARD	Male\nBERNARDO	Male\nBERNIE	Male\nBERRY	Male\nBERT	Male\nBERTRAM	Male\nBILL	Male\nBILLIE	Male\nBILLY	Male\nBLAINE	Male\nBLAIR	Male\nBLAKE	Male\nBO	Male\nBOB	Male\nBOBBIE	Male\nBOBBY	Male\nBOOKER	Male\nBORIS	Male\nBOYCE	Male\nBOYD	Male\nBRAD	Male\nBRADFORD	Male\nBRADLEY	Male\nBRADLY	Male\nBRADY	Male\nBRAIN	Male\nBRANDEN	Male\nBRANDON	Male\nBRANT	Male\nBRENDAN	Male\nBRENDON	Male\nBRENT	Male\nBRENTON	Male\nBRET	Male\nBRETT	Male\nBRIAN	Male\nBRICE	Male\nBRITT	Male\nBROCK	Male\nBRODERICK	Male\nBROOKS	Male\nBRUCE	Male\nBRUNO	Male\nBRYAN	Male\nBRYANT	Male\nBRYCE	Male\nBRYON	Male\nBUCK	Male\nBUD	Male\nBUDDY	Male\nBUFORD	Male\nBURL	Male\nBURT	Male\nBURTON	Male\nBUSTER	Male\nBYRON	Male\nCALEB	Male\nCALVIN	Male\nCAMERON	Male\nCAREY	Male\nCARL	Male\nCARLO	Male\nCARLOS	Male\nCARLTON	Male\nCARMELO	Male\nCARMEN	Male\nCARMINE	Male\nCAROL	Male\nCARROL	Male\nCARROLL	Male\nCARSON	Male\nCARTER	Male\nCARY	Male\nCASEY	Male\nCECIL	Male\nCEDRIC	Male\nCEDRICK	Male\nCESAR	Male\nCHAD	Male\nCHADWICK	Male\nCHANCE	Male\nCHANG	Male\nCHARLES	Male\nCHARLEY	Male\nCHARLIE	Male\nCHAS	Male\nCHASE	Male\nCHAUNCEY	Male\nCHESTER	Male\nCHET	Male\nCHI	Male\nCHONG	Male\nCHRIS	Male\nCHRISTIAN	Male\nCHRISTOPER	Male\nCHRISTOPHER	Male\nCHUCK	Male\nCHUNG	Male\nCLAIR	Male\nCLARENCE	Male\nCLARK	Male\nCLAUD	Male\nCLAUDE	Male\nCLAUDIO	Male\nCLAY	Male\nCLAYTON	Male\nCLEMENT	Male\nCLEMENTE	Male\nCLEO	Male\nCLETUS	Male\nCLEVELAND	Male\nCLIFF	Male\nCLIFFORD	Male\nCLIFTON	Male\nCLINT	Male\nCLINTON	Male\nCLYDE	Male\nCODY	Male\nCOLBY	Male\nCOLE	Male\nCOLEMAN	Male\nCOLIN	Male\nCOLLIN	Male\nCOLTON	Male\nCOLUMBUS	Male\nCONNIE	Male\nCONRAD	Male\nCORDELL	Male\nCOREY	Male\nCORNELIUS	Male\nCORNELL	Male\nCORTEZ	Male\nCORY	Male\nCOURTNEY	Male\nCOY	Male\nCRAIG	Male\nCRISTOBAL	Male\nCRISTOPHER	Male\nCRUZ	Male\nCURT	Male\nCURTIS	Male\nCYRIL	Male\nCYRUS	Male\nDALE	Male\nDALLAS	Male\nDALTON	Male\nDAMIAN	Male\nDAMIEN	Male\nDAMION	Male\nDAMON	Male\nDAN	Male\nDANA	Male\nDANE	Male\nDANIAL	Male\nDANIEL	Male\nDANILO	Male\nDANNIE	Male\nDANNY	Male\nDANTE	Male\nDARELL	Male\nDAREN	Male\nDARIN	Male\nDARIO	Male\nDARIUS	Male\nDARNELL	Male\nDARON	Male\nDARREL	Male\nDARRELL	Male\nDARREN	Male\nDARRICK	Male\nDARRIN	Male\nDARRON	Male\nDARRYL	Male\nDARWIN	Male\nDARYL	Male\nDAVE	Male\nDAVID	Male\nDAVIS	Male\nDEAN	Male\nDEANDRE	Male\nDEANGELO	Male\nDEE	Male\nDEL	Male\nDELBERT	Male\nDELMAR	Male\nDELMER	Male\nDEMARCUS	Male\nDEMETRIUS	Male\nDENIS	Male\nDENNIS	Male\nDENNY	Male\nDENVER	Male\nDEON	Male\nDEREK	Male\nDERICK	Male\nDERRICK	Male\nDESHAWN	Male\nDESMOND	Male\nDEVIN	Male\nDEVON	Male\nDEWAYNE	Male\nDEWEY	Male\nDEWITT	Male\nDEXTER	Male\nDICK	Male\nDIEGO	Male\nDILLON	Male\nDINO	Male\nDION	Male\nDIRK	Male\nDOMENIC	Male\nDOMINGO	Male\nDOMINIC	Male\nDOMINICK	Male\nDOMINIQUE	Male\nDON	Male\nDONALD	Male\nDONG	Male\nDONN	Male\nDONNELL	Male\nDONNIE	Male\nDONNY	Male\nDONOVAN	Male\nDONTE	Male\nDORIAN	Male\nDORSEY	Male\nDOUG	Male\nDOUGLAS	Male\nDOUGLASS	Male\nDOYLE	Male\nDREW	Male\nDUANE	Male\nDUDLEY	Male\nDUNCAN	Male\nDUSTIN	Male\nDUSTY	Male\nDWAIN	Male\nDWAYNE	Male\nDWIGHT	Male\nDYLAN	Male\nEARL	Male\nEARLE	Male\nEARNEST	Male\nED	Male\nEDDIE	Male\nEDDY	Male\nEDGAR	Male\nEDGARDO	Male\nEDISON	Male\nEDMOND	Male\nEDMUND	Male\nEDMUNDO	Male\nEDUARDO	Male\nEDWARD	Male\nEDWARDO	Male\nEDWIN	Male\nEFRAIN	Male\nEFREN	Male\nELBERT	Male\nELDEN	Male\nELDON	Male\nELDRIDGE	Male\nELI	Male\nELIAS	Male\nELIJAH	Male\nELISEO	Male\nELISHA	Male\nELLIOT	Male\nELLIOTT	Male\nELLIS	Male\nELLSWORTH	Male\nELMER	Male\nELMO	Male\nELOY	Male\nELROY	Male\nELTON	Male\nELVIN	Male\nELVIS	Male\nELWOOD	Male\nEMANUEL	Male\nEMERSON	Male\nEMERY	Male\nEMIL	Male\nEMILE	Male\nEMILIO	Male\nEMMANUEL	Male\nEMMETT	Male\nEMMITT	Male\nEMORY	Male\nENOCH	Male\nENRIQUE	Male\nERASMO	Male\nERIC	Male\nERICH	Male\nERICK	Male\nERIK	Male\nERIN	Male\nERNEST	Male\nERNESTO	Male\nERNIE	Male\nERROL	Male\nERVIN	Male\nERWIN	Male\nESTEBAN	Male\nETHAN	Male\nEUGENE	Male\nEUGENIO	Male\nEUSEBIO	Male\nEVAN	Male\nEVERETT	Male\nEVERETTE	Male\nEZEKIEL	Male\nEZEQUIEL	Male\nEZRA	Male\nFABIAN	Male\nFAUSTINO	Male\nFAUSTO	Male\nFEDERICO	Male\nFELIPE	Male\nFELIX	Male\nFELTON	Male\nFERDINAND	Male\nFERMIN	Male\nFERNANDO	Male\nFIDEL	Male\nFILIBERTO	Male\nFLETCHER	Male\nFLORENCIO	Male\nFLORENTINO	Male\nFLOYD	Male\nFOREST	Male\nFORREST	Male\nFOSTER	Male\nFRANCES	Male\nFRANCESCO	Male\nFRANCIS	Male\nFRANCISCO	Male\nFRANK	Male\nFRANKIE	Male\nFRANKLIN	Male\nFRANKLYN	Male\nFRED	Male\nFREDDIE	Male\nFREDDY	Male\nFREDERIC	Male\nFREDERICK	Male\nFREDRIC	Male\nFREDRICK	Male\nFREEMAN	Male\nFRITZ	Male\nGABRIEL	Male\nGAIL	Male\nGALE	Male\nGALEN	Male\nGARFIELD	Male\nGARLAND	Male\nGARRET	Male\nGARRETT	Male\nGARRY	Male\nGARTH	Male\nGARY	Male\nGASTON	Male\nGAVIN	Male\nGAYLE	Male\nGAYLORD	Male\nGENARO	Male\nGENE	Male\nGEOFFREY	Male\nGEORGE	Male\nGERALD	Male\nGERALDO	Male\nGERARD	Male\nGERARDO	Male\nGERMAN	Male\nGERRY	Male\nGIL	Male\nGILBERT	Male\nGILBERTO	Male\nGINO	Male\nGIOVANNI	Male\nGIUSEPPE	Male\nGLEN	Male\nGLENN	Male\nGONZALO	Male\nGORDON	Male\nGRADY	Male\nGRAHAM	Male\nGRAIG	Male\nGRANT	Male\nGRANVILLE	Male\nGREG	Male\nGREGG	Male\nGREGORIO	Male\nGREGORY	Male\nGROVER	Male\nGUADALUPE	Male\nGUILLERMO	Male\nGUS	Male\nGUSTAVO	Male\nGUY	Male\nHAI	Male\nHAL	Male\nHANK	Male\nHANS	Male\nHARLAN	Male\nHARLAND	Male\nHARLEY	Male\nHAROLD	Male\nHARRIS	Male\nHARRISON	Male\nHARRY	Male\nHARVEY	Male\nHASSAN	Male\nHAYDEN	Male\nHAYWOOD	Male\nHEATH	Male\nHECTOR	Male\nHENRY	Male\nHERB	Male\nHERBERT	Male\nHERIBERTO	Male\nHERMAN	Male\nHERSCHEL	Male\nHERSHEL	Male\nHILARIO	Male\nHILTON	Male\nHIPOLITO	Male\nHIRAM	Male\nHOBERT	Male\nHOLLIS	Male\nHOMER	Male\nHONG	Male\nHORACE	Male\nHORACIO	Male\nHOSEA	Male\nHOUSTON	Male\nHOWARD	Male\nHOYT	Male\nHUBERT	Male\nHUEY	Male\nHUGH	Male\nHUGO	Male\nHUMBERTO	Male\nHUNG	Male\nHUNTER	Male\nHYMAN	Male\nIAN	Male\nIGNACIO	Male\nIKE	Male\nIRA	Male\nIRVIN	Male\nIRVING	Male\nIRWIN	Male\nISAAC	Male\nISAIAH	Male\nISAIAS	Male\nISIAH	Male\nISIDRO	Male\nISMAEL	Male\nISRAEL	Male\nISREAL	Male\nISSAC	Male\nIVAN	Male\nIVORY	Male\nJACINTO	Male\nJACK	Male\nJACKIE	Male\nJACKSON	Male\nJACOB	Male\nJACQUES	Male\nJAE	Male\nJAIME	Male\nJAKE	Male\nJAMAAL	Male\nJAMAL	Male\nJAMAR	Male\nJAME	Male\nJAMEL	Male\nJAMES	Male\nJAMEY	Male\nJAMIE	Male\nJAMISON	Male\nJAN	Male\nJARED	Male\nJAROD	Male\nJARRED	Male\nJARRETT	Male\nJARROD	Male\nJARVIS	Male\nJASON	Male\nJASPER	Male\nJAVIER	Male\nJAY	Male\nJAYSON	Male\nJC	Male\nJEAN	Male\nJED	Male\nJEFF	Male\nJEFFEREY	Male\nJEFFERSON	Male\nJEFFERY	Male\nJEFFREY	Male\nJEFFRY	Male\nJERALD	Male\nJERAMY	Male\nJERE	Male\nJEREMIAH	Male\nJEREMY	Male\nJERMAINE	Male\nJEROLD	Male\nJEROME	Male\nJEROMY	Male\nJERRELL	Male\nJERROD	Male\nJERROLD	Male\nJERRY	Male\nJESS	Male\nJESSE	Male\nJESSIE	Male\nJESUS	Male\nJEWEL	Male\nJEWELL	Male\nJIM	Male\nJIMMIE	Male\nJIMMY	Male\nJOAN	Male\nJOAQUIN	Male\nJODY	Male\nJOE	Male\nJOEL	Male\nJOESPH	Male\nJOEY	Male\nJOHN	Male\nJOHNATHAN	Male\nJOHNATHON	Male\nJOHNIE	Male\nJOHNNIE	Male\nJOHNNY	Male\nJOHNSON	Male\nJON	Male\nJONAH	Male\nJONAS	Male\nJONATHAN	Male\nJONATHON	Male\nJORDAN	Male\nJORDON	Male\nJORGE	Male\nJOSE	Male\nJOSEF	Male\nJOSEPH	Male\nJOSH	Male\nJOSHUA	Male\nJOSIAH	Male\nJOSPEH	Male\nJOSUE	Male\nJUAN	Male\nJUDE	Male\nJUDSON	Male\nJULES	Male\nJULIAN	Male\nJULIO	Male\nJULIUS	Male\nJUNIOR	Male\nJUSTIN	Male\nKAREEM	Male\nKARL	Male\nKASEY	Male\nKEENAN	Male\nKEITH	Male\nKELLEY	Male\nKELLY	Male\nKELVIN	Male\nKEN	Male\nKENDALL	Male\nKENDRICK	Male\nKENETH	Male\nKENNETH	Male\nKENNITH	Male\nKENNY	Male\nKENT	Male\nKENTON	Male\nKERMIT	Male\nKERRY	Male\nKEVEN	Male\nKEVIN	Male\nKIETH	Male\nKIM	Male\nKING	Male\nKIP	Male\nKIRBY	Male\nKIRK	Male\nKOREY	Male\nKORY	Male\nKRAIG	Male\nKRIS	Male\nKRISTOFER	Male\nKRISTOPHER	Male\nKURT	Male\nKURTIS	Male\nKYLE	Male\nLACY	Male\nLAMAR	Male\nLAMONT	Male\nLANCE	Male\nLANDON	Male\nLANE	Male\nLANNY	Male\nLARRY	Male\nLAUREN	Male\nLAURENCE	Male\nLAVERN	Male\nLAVERNE	Male\nLAWERENCE	Male\nLAWRENCE	Male\nLAZARO	Male\nLEANDRO	Male\nLEE	Male\nLEIF	Male\nLEIGH	Male\nLELAND	Male\nLEMUEL	Male\nLEN	Male\nLENARD	Male\nLENNY	Male\nLEO	Male\nLEON	Male\nLEONARD	Male\nLEONARDO	Male\nLEONEL	Male\nLEOPOLDO	Male\nLEROY	Male\nLES	Male\nLESLEY	Male\nLESLIE	Male\nLESTER	Male\nLEVI	Male\nLEWIS	Male\nLINCOLN	Male\nLINDSAY	Male\nLINDSEY	Male\nLINO	Male\nLINWOOD	Male\nLIONEL	Male\nLLOYD	Male\nLOGAN	Male\nLON	Male\nLONG	Male\nLONNIE	Male\nLONNY	Male\nLOREN	Male\nLORENZO	Male\nLOU	Male\nLOUIE	Male\nLOUIS	Male\nLOWELL	Male\nLOYD	Male\nLUCAS	Male\nLUCIANO	Male\nLUCIEN	Male\nLUCIO	Male\nLUCIUS	Male\nLUIGI	Male\nLUIS	Male\nLUKE	Male\nLUPE	Male\nLUTHER	Male\nLYLE	Male\nLYMAN	Male\nLYNDON	Male\nLYNN	Male\nLYNWOOD	Male\nMAC	Male\nMACK	Male\nMAJOR	Male\nMALCOLM	Male\nMALCOM	Male\nMALIK	Male\nMAN	Male\nMANUAL	Male\nMANUEL	Male\nMARC	Male\nMARCEL	Male\nMARCELINO	Male\nMARCELLUS	Male\nMARCELO	Male\nMARCO	Male\nMARCOS	Male\nMARCUS	Male\nMARGARITO	Male\nMARIA	Male\nMARIANO	Male\nMARIO	Male\nMARION	Male\nMARK	Male\nMARKUS	Male\nMARLIN	Male\nMARLON	Male\nMARQUIS	Male\nMARSHALL	Male\nMARTIN	Male\nMARTY	Male\nMARVIN	Male\nMARY	Male\nMASON	Male\nMATHEW	Male\nMATT	Male\nMATTHEW	Male\nMAURICE	Male\nMAURICIO	Male\nMAURO	Male\nMAX	Male\nMAXIMO	Male\nMAXWELL	Male\nMAYNARD	Male\nMCKINLEY	Male\nMEL	Male\nMELVIN	Male\nMERLE	Male\nMERLIN	Male\nMERRILL	Male\nMERVIN	Male\nMICAH	Male\nMICHAEL	Male\nMICHAL	Male\nMICHALE	Male\nMICHEAL	Male\nMICHEL	Male\nMICKEY	Male\nMIGUEL	Male\nMIKE	Male\nMIKEL	Male\nMILAN	Male\nMILES	Male\nMILFORD	Male\nMILLARD	Male\nMILO	Male\nMILTON	Male\nMINH	Male\nMIQUEL	Male\nMITCH	Male\nMITCHEL	Male\nMITCHELL	Male\nMODESTO	Male\nMOHAMED	Male\nMOHAMMAD	Male\nMOHAMMED	Male\nMOISES	Male\nMONROE	Male\nMONTE	Male\nMONTY	Male\nMORGAN	Male\nMORRIS	Male\nMORTON	Male\nMOSE	Male\nMOSES	Male\nMOSHE	Male\nMURRAY	Male\nMYLES	Male\nMYRON	Male\nNAPOLEON	Male\nNATHAN	Male\nNATHANAEL	Male\nNATHANIAL	Male\nNATHANIEL	Male\nNEAL	Male\nNED	Male\nNEIL	Male\nNELSON	Male\nNESTOR	Male\nNEVILLE	Male\nNEWTON	Male\nNICHOLAS	Male\nNICK	Male\nNICKOLAS	Male\nNICKY	Male\nNICOLAS	Male\nNIGEL	Male\nNOAH	Male\nNOBLE	Male\nNOE	Male\nNOEL	Male\nNOLAN	Male\nNORBERT	Male\nNORBERTO	Male\nNORMAN	Male\nNORMAND	Male\nNORRIS	Male\nNUMBERS	Male\nOCTAVIO	Male\nODELL	Male\nODIS	Male\nOLEN	Male\nOLIN	Male\nOLIVER	Male\nOLLIE	Male\nOMAR	Male\nOMER	Male\nOREN	Male\nORLANDO	Male\nORVAL	Male\nORVILLE	Male\nOSCAR	Male\nOSVALDO	Male\nOSWALDO	Male\nOTHA	Male\nOTIS	Male\nOTTO	Male\nOWEN	Male\nPABLO	Male\nPALMER	Male\nPARIS	Male\nPARKER	Male\nPASQUALE	Male\nPAT	Male\nPATRICIA	Male\nPATRICK	Male\nPAUL	Male\nPEDRO	Male\nPERCY	Male\nPERRY	Male\nPETE	Male\nPETER	Male\nPHIL	Male\nPHILIP	Male\nPHILLIP	Male\nPIERRE	Male\nPORFIRIO	Male\nPORTER	Male\nPRESTON	Male\nPRINCE	Male\nQUENTIN	Male\nQUINCY	Male\nQUINN	Male\nQUINTIN	Male\nQUINTON	Male\nRAFAEL	Male\nRALEIGH	Male\nRALPH	Male\nRAMIRO	Male\nRAMON	Male\nRANDAL	Male\nRANDALL	Male\nRANDELL	Male\nRANDOLPH	Male\nRANDY	Male\nRAPHAEL	Male\nRASHAD	Male\nRAUL	Male\nRAY	Male\nRAYFORD	Male\nRAYMON	Male\nRAYMOND	Male\nRAYMUNDO	Male\nREED	Male\nREFUGIO	Male\nREGGIE	Male\nREGINALD	Male\nREID	Male\nREINALDO	Male\nRENALDO	Male\nRENATO	Male\nRENE	Male\nREUBEN	Male\nREX	Male\nREY	Male\nREYES	Male\nREYNALDO	Male\nRHETT	Male\nRICARDO	Male\nRICH	Male\nRICHARD	Male\nRICHIE	Male\nRICK	Male\nRICKEY	Male\nRICKIE	Male\nRICKY	Male\nRICO	Male\nRIGOBERTO	Male\nRILEY	Male\nROB	Male\nROBBIE	Male\nROBBY	Male\nROBERT	Male\nROBERTO	Male\nROBIN	Male\nROBT	Male\nROCCO	Male\nROCKY	Male\nROD	Male\nRODERICK	Male\nRODGER	Male\nRODNEY	Male\nRODOLFO	Male\nRODRICK	Male\nRODRIGO	Male\nROGELIO	Male\nROGER	Male\nROLAND	Male\nROLANDO	Male\nROLF	Male\nROLLAND	Male\nROMAN	Male\nROMEO	Male\nRON	Male\nRONALD	Male\nRONNIE	Male\nRONNY	Male\nROOSEVELT	Male\nRORY	Male\nROSARIO	Male\nROSCOE	Male\nROSENDO	Male\nROSS	Male\nROY	Male\nROYAL	Male\nROYCE	Male\nRUBEN	Male\nRUBIN	Male\nRUDOLF	Male\nRUDOLPH	Male\nRUDY	Male\nRUEBEN	Male\nRUFUS	Male\nRUPERT	Male\nRUSS	Male\nRUSSEL	Male\nRUSSELL	Male\nRUSTY	Male\nRYAN	Male\nSAL	Male\nSALVADOR	Male\nSALVATORE	Male\nSAM	Male\nSAMMIE	Male\nSAMMY	Male\nSAMUAL	Male\nSAMUEL	Male\nSANDY	Male\nSANFORD	Male\nSANG	Male\nSANTIAGO	Male\nSANTO	Male\nSANTOS	Male\nSAUL	Male\nSCOT	Male\nSCOTT	Male\nSCOTTIE	Male\nSCOTTY	Male\nSEAN	Male\nSEBASTIAN	Male\nSERGIO	Male\nSETH	Male\nSEYMOUR	Male\nSHAD	Male\nSHANE	Male\nSHANNON	Male\nSHAUN	Male\nSHAWN	Male\nSHAYNE	Male\nSHELBY	Male\nSHELDON	Male\nSHELTON	Male\nSHERMAN	Male\nSHERWOOD	Male\nSHIRLEY	Male\nSHON	Male\nSID	Male\nSIDNEY	Male\nSILAS	Male\nSIMON	Male\nSOL	Male\nSOLOMON	Male\nSON	Male\nSONNY	Male\nSPENCER	Male\nSTACEY	Male\nSTACY	Male\nSTAN	Male\nSTANFORD	Male\nSTANLEY	Male\nSTANTON	Male\nSTEFAN	Male\nSTEPHAN	Male\nSTEPHEN	Male\nSTERLING	Male\nSTEVE	Male\nSTEVEN	Male\nSTEVIE	Male\nSTEWART	Male\nSTUART	Male\nSUNG	Male\nSYDNEY	Male\nSYLVESTER	Male\nTAD	Male\nTANNER	Male\nTAYLOR	Male\nTED	Male\nTEDDY	Male\nTEODORO	Male\nTERENCE	Male\nTERRANCE	Male\nTERRELL	Male\nTERRENCE	Male\nTERRY	Male\nTHAD	Male\nTHADDEUS	Male\nTHANH	Male\nTHEO	Male\nTHEODORE	Male\nTHERON	Male\nTHOMAS	Male\nTHURMAN	Male\nTIM	Male\nTIMMY	Male\nTIMOTHY	Male\nTITUS	Male\nTOBIAS	Male\nTOBY	Male\nTOD	Male\nTODD	Male\nTOM	Male\nTOMAS	Male\nTOMMIE	Male\nTOMMY	Male\nTONEY	Male\nTONY	Male\nTORY	Male\nTRACEY	Male\nTRACY	Male\nTRAVIS	Male\nTRENT	Male\nTRENTON	Male\nTREVOR	Male\nTREY	Male\nTRINIDAD	Male\nTRISTAN	Male\nTROY	Male\nTRUMAN	Male\nTUAN	Male\nTY	Male\nTYLER	Male\nTYREE	Male\nTYRELL	Male\nTYRON	Male\nTYRONE	Male\nTYSON	Male\nULYSSES	Male\nVAL	Male\nVALENTIN	Male\nVALENTINE	Male\nVAN	Male\nVANCE	Male\nVAUGHN	Male\nVERN	Male\nVERNON	Male\nVICENTE	Male\nVICTOR	Male\nVINCE	Male\nVINCENT	Male\nVINCENZO	Male\nVIRGIL	Male\nVIRGILIO	Male\nVITO	Male\nVON	Male\nWADE	Male\nWALDO	Male\nWALKER	Male\nWALLACE	Male\nWALLY	Male\nWALTER	Male\nWALTON	Male\nWARD	Male\nWARNER	Male\nWARREN	Male\nWAYLON	Male\nWAYNE	Male\nWELDON	Male\nWENDELL	Male\nWERNER	Male\nWES	Male\nWESLEY	Male\nWESTON	Male\nWHITNEY	Male\nWILBER	Male\nWILBERT	Male\nWILBUR	Male\nWILBURN	Male\nWILEY	Male\nWILFORD	Male\nWILFRED	Male\nWILFREDO	Male\nWILL	Male\nWILLARD	Male\nWILLIAM	Male\nWILLIAMS	Male\nWILLIAN	Male\nWILLIE	Male\nWILLIS	Male\nWILLY	Male\nWILMER	Male\nWILSON	Male\nWILTON	Male\nWINFORD	Male\nWINFRED	Male\nWINSTON	Male\nWM	Male\nWOODROW	Male\nWYATT	Male\nXAVIER	Male\nYONG	Male\nYOUNG	Male\nZACHARIAH	Male\nZACHARY	Male\nZACHERY	Male\nZACK	Male\nZACKARY	Male\nZANE	Male\nAARON	Female\nABBEY	Female\nABBIE	Female\nABBY	Female\nABIGAIL	Female\nADA	Female\nADAH	Female\nADALINE	Female\nADAM	Female\nADDIE	Female\nADELA	Female\nADELAIDA	Female\nADELAIDE	Female\nADELE	Female\nADELIA	Female\nADELINA	Female\nADELINE	Female\nADELL	Female\nADELLA	Female\nADELLE	Female\nADENA	Female\nADINA	Female\nADRIA	Female\nADRIAN	Female\nADRIANA	Female\nADRIANE	Female\nADRIANNA	Female\nADRIANNE	Female\nADRIEN	Female\nADRIENE	Female\nADRIENNE	Female\nAFTON	Female\nAGATHA	Female\nAGNES	Female\nAGNUS	Female\nAGRIPINA	Female\nAGUEDA	Female\nAGUSTINA	Female\nAI	Female\nAIDA	Female\nAIDE	Female\nAIKO	Female\nAILEEN	Female\nAILENE	Female\nAIMEE	Female\nAISHA	Female\nAJA	Female\nAKIKO	Female\nAKILAH	Female\nALAINA	Female\nALAINE	Female\nALANA	Female\nALANE	Female\nALANNA	Female\nALAYNA	Female\nALBA	Female\nALBERT	Female\nALBERTA	Female\nALBERTHA	Female\nALBERTINA	Female\nALBERTINE	Female\nALBINA	Female\nALDA	Female\nALEASE	Female\nALECIA	Female\nALEEN	Female\nALEIDA	Female\nALEISHA	Female\nALEJANDRA	Female\nALEJANDRINA	Female\nALENA	Female\nALENE	Female\nALESHA	Female\nALESHIA	Female\nALESIA	Female\nALESSANDRA	Female\nALETA	Female\nALETHA	Female\nALETHEA	Female\nALETHIA	Female\nALEX	Female\nALEXA	Female\nALEXANDER	Female\nALEXANDRA	Female\nALEXANDRIA	Female\nALEXIA	Female\nALEXIS	Female\nALFREDA	Female\nALFREDIA	Female\nALI	Female\nALIA	Female\nALICA	Female\nALICE	Female\nALICIA	Female\nALIDA	Female\nALINA	Female\nALINE	Female\nALISA	Female\nALISE	Female\nALISHA	Female\nALISHIA	Female\nALISIA	Female\nALISON	Female\nALISSA	Female\nALITA	Female\nALIX	Female\nALIZA	Female\nALLA	Female\nALLEEN	Female\nALLEGRA	Female\nALLEN	Female\nALLENA	Female\nALLENE	Female\nALLIE	Female\nALLINE	Female\nALLISON	Female\nALLYN	Female\nALLYSON	Female\nALMA	Female\nALMEDA	Female\nALMETA	Female\nALONA	Female\nALPHA	Female\nALTA	Female\nALTAGRACIA	Female\nALTHA	Female\nALTHEA	Female\nALVA	Female\nALVERA	Female\nALVERTA	Female\nALVINA	Female\nALYCE	Female\nALYCIA	Female\nALYSA	Female\nALYSE	Female\nALYSHA	Female\nALYSIA	Female\nALYSON	Female\nALYSSA	Female\nAMADA	Female\nAMAL	Female\nAMALIA	Female\nAMANDA	Female\nAMBER	Female\nAMBERLY	Female\nAMEE	Female\nAMELIA	Female\nAMERICA	Female\nAMI	Female\nAMIE	Female\nAMIEE	Female\nAMINA	Female\nAMIRA	Female\nAMMIE	Female\nAMPARO	Female\nAMY	Female\nAN	Female\nANA	Female\nANABEL	Female\nANALISA	Female\nANAMARIA	Female\nANASTACIA	Female\nANASTASIA	Female\nANDERA	Female\nANDRA	Female\nANDRE	Female\nANDREA	Female\nANDREE	Female\nANDREW	Female\nANDRIA	Female\nANETTE	Female\nANGEL	Female\nANGELA	Female\nANGELE	Female\nANGELENA	Female\nANGELES	Female\nANGELIA	Female\nANGELIC	Female\nANGELICA	Female\nANGELIKA	Female\nANGELINA	Female\nANGELINE	Female\nANGELIQUE	Female\nANGELITA	Female\nANGELLA	Female\nANGELO	Female\nANGELYN	Female\nANGIE	Female\nANGILA	Female\nANGLA	Female\nANGLE	Female\nANGLEA	Female\nANH	Female\nANIKA	Female\nANISA	Female\nANISHA	Female\nANISSA	Female\nANITA	Female\nANITRA	Female\nANJA	Female\nANJANETTE	Female\nANJELICA	Female\nANN	Female\nANNA	Female\nANNABEL	Female\nANNABELL	Female\nANNABELLE	Female\nANNALEE	Female\nANNALISA	Female\nANNAMAE	Female\nANNAMARIA	Female\nANNAMARIE	Female\nANNE	Female\nANNELIESE	Female\nANNELLE	Female\nANNEMARIE	Female\nANNETT	Female\nANNETTA	Female\nANNETTE	Female\nANNICE	Female\nANNIE	Female\nANNIKA	Female\nANNIS	Female\nANNITA	Female\nANNMARIE	Female\nANTHONY	Female\nANTIONETTE	Female\nANTOINETTE	Female\nANTONETTA	Female\nANTONETTE	Female\nANTONIA	Female\nANTONIETTA	Female\nANTONINA	Female\nANTONIO	Female\nANYA	Female\nAPOLONIA	Female\nAPRIL	Female\nAPRYL	Female\nARA	Female\nARACELI	Female\nARACELIS	Female\nARACELY	Female\nARCELIA	Female\nARDATH	Female\nARDELIA	Female\nARDELL	Female\nARDELLA	Female\nARDELLE	Female\nARDIS	Female\nARDITH	Female\nARETHA	Female\nARGELIA	Female\nARGENTINA	Female\nARIANA	Female\nARIANE	Female\nARIANNA	Female\nARIANNE	Female\nARICA	Female\nARIE	Female\nARIEL	Female\nARIELLE	Female\nARLA	Female\nARLEAN	Female\nARLEEN	Female\nARLENA	Female\nARLENE	Female\nARLETHA	Female\nARLETTA	Female\nARLETTE	Female\nARLINDA	Female\nARLINE	Female\nARLYNE	Female\nARMANDA	Female\nARMANDINA	Female\nARMIDA	Female\nARMINDA	Female\nARNETTA	Female\nARNETTE	Female\nARNITA	Female\nARTHUR	Female\nARTIE	Female\nARVILLA	Female\nASHA	Female\nASHANTI	Female\nASHELY	Female\nASHLEA	Female\nASHLEE	Female\nASHLEIGH	Female\nASHLEY	Female\nASHLI	Female\nASHLIE	Female\nASHLY	Female\nASHLYN	Female\nASHTON	Female\nASIA	Female\nASLEY	Female\nASSUNTA	Female\nASTRID	Female\nASUNCION	Female\nATHENA	Female\nAUBREY	Female\nAUDIE	Female\nAUDRA	Female\nAUDREA	Female\nAUDREY	Female\nAUDRIA	Female\nAUDRIE	Female\nAUDRY	Female\nAUGUSTA	Female\nAUGUSTINA	Female\nAUGUSTINE	Female\nAUNDREA	Female\nAURA	Female\nAUREA	Female\nAURELIA	Female\nAURORA	Female\nAURORE	Female\nAUSTIN	Female\nAUTUMN	Female\nAVA	Female\nAVELINA	Female\nAVERY	Female\nAVIS	Female\nAVRIL	Female\nAWILDA	Female\nAYAKO	Female\nAYANA	Female\nAYANNA	Female\nAYESHA	Female\nAZALEE	Female\nAZUCENA	Female\nAZZIE	Female\nBABARA	Female\nBABETTE	Female\nBAILEY	Female\nBAMBI	Female\nBAO	Female\nBARABARA	Female\nBARB	Female\nBARBAR	Female\nBARBARA	Female\nBARBERA	Female\nBARBIE	Female\nBARBRA	Female\nBARI	Female\nBARRIE	Female\nBASILIA	Female\nBEA	Female\nBEATA	Female\nBEATRICE	Female\nBEATRIS	Female\nBEATRIZ	Female\nBEAULAH	Female\nBEBE	Female\nBECKI	Female\nBECKIE	Female\nBECKY	Female\nBEE	Female\nBELEN	Female\nBELIA	Female\nBELINDA	Female\nBELKIS	Female\nBELL	Female\nBELLA	Female\nBELLE	Female\nBELVA	Female\nBENITA	Female\nBENNIE	Female\nBERENICE	Female\nBERNA	Female\nBERNADETTE	Female\nBERNADINE	Female\nBERNARDA	Female\nBERNARDINA	Female\nBERNARDINE	Female\nBERNEICE	Female\nBERNETTA	Female\nBERNICE	Female\nBERNIE	Female\nBERNIECE	Female\nBERNITA	Female\nBERRY	Female\nBERTA	Female\nBERTHA	Female\nBERTIE	Female\nBERYL	Female\nBESS	Female\nBESSIE	Female\nBETH	Female\nBETHANIE	Female\nBETHANN	Female\nBETHANY	Female\nBETHEL	Female\nBETSEY	Female\nBETSY	Female\nBETTE	Female\nBETTIE	Female\nBETTINA	Female\nBETTY	Female\nBETTYANN	Female\nBETTYE	Female\nBEULA	Female\nBEULAH	Female\nBEV	Female\nBEVERLEE	Female\nBEVERLEY	Female\nBEVERLY	Female\nBIANCA	Female\nBIBI	Female\nBILLI	Female\nBILLIE	Female\nBILLY	Female\nBILLYE	Female\nBIRDIE	Female\nBIRGIT	Female\nBLAIR	Female\nBLAKE	Female\nBLANCA	Female\nBLANCH	Female\nBLANCHE	Female\nBLONDELL	Female\nBLOSSOM	Female\nBLYTHE	Female\nBOBBI	Female\nBOBBIE	Female\nBOBBY	Female\nBOBBYE	Female\nBOBETTE	Female\nBOK	Female\nBONG	Female\nBONITA	Female\nBONNIE	Female\nBONNY	Female\nBRANDA	Female\nBRANDE	Female\nBRANDEE	Female\nBRANDI	Female\nBRANDIE	Female\nBRANDON	Female\nBRANDY	Female\nBREANA	Female\nBREANN	Female\nBREANNA	Female\nBREANNE	Female\nBREE	Female\nBRENDA	Female\nBRENNA	Female\nBRETT	Female\nBRIAN	Female\nBRIANA	Female\nBRIANNA	Female\nBRIANNE	Female\nBRIDGET	Female\nBRIDGETT	Female\nBRIDGETTE	Female\nBRIGETTE	Female\nBRIGID	Female\nBRIGIDA	Female\nBRIGITTE	Female\nBRINDA	Female\nBRITANY	Female\nBRITNEY	Female\nBRITNI	Female\nBRITT	Female\nBRITTA	Female\nBRITTANEY	Female\nBRITTANI	Female\nBRITTANIE	Female\nBRITTANY	Female\nBRITTENY	Female\nBRITTNEY	Female\nBRITTNI	Female\nBRITTNY	Female\nBRONWYN	Female\nBROOK	Female\nBROOKE	Female\nBRUNA	Female\nBRUNILDA	Female\nBRYANNA	Female\nBRYNN	Female\nBUENA	Female\nBUFFY	Female\nBULA	Female\nBULAH	Female\nBUNNY	Female\nBURMA	Female\nCAITLIN	Female\nCAITLYN	Female\nCALANDRA	Female\nCALISTA	Female\nCALLIE	Female\nCAMELIA	Female\nCAMELLIA	Female\nCAMERON	Female\nCAMI	Female\nCAMIE	Female\nCAMILA	Female\nCAMILLA	Female\nCAMILLE	Female\nCAMMIE	Female\nCAMMY	Female\nCANDACE	Female\nCANDANCE	Female\nCANDELARIA	Female\nCANDI	Female\nCANDICE	Female\nCANDIDA	Female\nCANDIE	Female\nCANDIS	Female\nCANDRA	Female\nCANDY	Female\nCANDYCE	Female\nCAPRICE	Female\nCARA	Female\nCAREN	Female\nCAREY	Female\nCARI	Female\nCARIDAD	Female\nCARIE	Female\nCARIN	Female\nCARINA	Female\nCARISA	Female\nCARISSA	Female\nCARITA	Female\nCARL	Female\nCARLA	Female\nCARLEE	Female\nCARLEEN	Female\nCARLENA	Female\nCARLENE	Female\nCARLETTA	Female\nCARLEY	Female\nCARLI	Female\nCARLIE	Female\nCARLINE	Female\nCARLITA	Female\nCARLOS	Female\nCARLOTA	Female\nCARLOTTA	Female\nCARLY	Female\nCARLYN	Female\nCARMA	Female\nCARMAN	Female\nCARMEL	Female\nCARMELA	Female\nCARMELIA	Female\nCARMELINA	Female\nCARMELITA	Female\nCARMELLA	Female\nCARMEN	Female\nCARMINA	Female\nCARMON	Female\nCAROL	Female\nCAROLA	Female\nCAROLANN	Female\nCAROLE	Female\nCAROLEE	Female\nCAROLIN	Female\nCAROLINA	Female\nCAROLINE	Female\nCAROLL	Female\nCAROLYN	Female\nCAROLYNE	Female\nCAROLYNN	Female\nCARON	Female\nCAROYLN	Female\nCARRI	Female\nCARRIE	Female\nCARROL	Female\nCARROLL	Female\nCARRY	Female\nCARY	Female\nCARYL	Female\nCARYLON	Female\nCARYN	Female\nCASANDRA	Female\nCASEY	Female\nCASIE	Female\nCASIMIRA	Female\nCASSANDRA	Female\nCASSAUNDRA	Female\nCASSEY	Female\nCASSI	Female\nCASSIDY	Female\nCASSIE	Female\nCASSONDRA	Female\nCASSY	Female\nCATALINA	Female\nCATARINA	Female\nCATERINA	Female\nCATHARINE	Female\nCATHERIN	Female\nCATHERINA	Female\nCATHERINE	Female\nCATHERN	Female\nCATHERYN	Female\nCATHEY	Female\nCATHI	Female\nCATHIE	Female\nCATHLEEN	Female\nCATHRINE	Female\nCATHRYN	Female\nCATHY	Female\nCATINA	Female\nCATRICE	Female\nCATRINA	Female\nCAYLA	Female\nCECELIA	Female\nCECIL	Female\nCECILA	Female\nCECILE	Female\nCECILIA	Female\nCECILLE	Female\nCECILY	Female\nCELENA	Female\nCELESTA	Female\nCELESTE	Female\nCELESTINA	Female\nCELESTINE	Female\nCELIA	Female\nCELINA	Female\nCELINDA	Female\nCELINE	Female\nCELSA	Female\nCEOLA	Female\nCHAE	Female\nCHAN	Female\nCHANA	Female\nCHANDA	Female\nCHANDRA	Female\nCHANEL	Female\nCHANELL	Female\nCHANELLE	Female\nCHANG	Female\nCHANTAL	Female\nCHANTAY	Female\nCHANTE	Female\nCHANTEL	Female\nCHANTELL	Female\nCHANTELLE	Female\nCHARA	Female\nCHARIS	Female\nCHARISE	Female\nCHARISSA	Female\nCHARISSE	Female\nCHARITA	Female\nCHARITY	Female\nCHARLA	Female\nCHARLEEN	Female\nCHARLENA	Female\nCHARLENE	Female\nCHARLES	Female\nCHARLESETTA	Female\nCHARLETTE	Female\nCHARLIE	Female\nCHARLINE	Female\nCHARLOTT	Female\nCHARLOTTE	Female\nCHARLSIE	Female\nCHARLYN	Female\nCHARMAIN	Female\nCHARMAINE	Female\nCHAROLETTE	Female\nCHASIDY	Female\nCHASITY	Female\nCHASSIDY	Female\nCHASTITY	Female\nCHAU	Female\nCHAYA	Female\nCHELSEA	Female\nCHELSEY	Female\nCHELSIE	Female\nCHER	Female\nCHERE	Female\nCHEREE	Female\nCHERELLE	Female\nCHERI	Female\nCHERIE	Female\nCHERILYN	Female\nCHERISE	Female\nCHERISH	Female\nCHERLY	Female\nCHERLYN	Female\nCHERRI	Female\nCHERRIE	Female\nCHERRY	Female\nCHERRYL	Female\nCHERY	Female\nCHERYL	Female\nCHERYLE	Female\nCHERYLL	Female\nCHEYENNE	Female\nCHI	Female\nCHIA	Female\nCHIEKO	Female\nCHIN	Female\nCHINA	Female\nCHING	Female\nCHIQUITA	Female\nCHLOE	Female\nCHONG	Female\nCHRIS	Female\nCHRISSY	Female\nCHRISTA	Female\nCHRISTAL	Female\nCHRISTEEN	Female\nCHRISTEL	Female\nCHRISTEN	Female\nCHRISTENA	Female\nCHRISTENE	Female\nCHRISTI	Female\nCHRISTIA	Female\nCHRISTIAN	Female\nCHRISTIANA	Female\nCHRISTIANE	Female\nCHRISTIE	Female\nCHRISTIN	Female\nCHRISTINA	Female\nCHRISTINE	Female\nCHRISTINIA	Female\nCHRISTOPHER	Female\nCHRISTY	Female\nCHRYSTAL	Female\nCHU	Female\nCHUN	Female\nCHUNG	Female\nCIARA	Female\nCICELY	Female\nCIERA	Female\nCIERRA	Female\nCINDA	Female\nCINDERELLA	Female\nCINDI	Female\nCINDIE	Female\nCINDY	Female\nCINTHIA	Female\nCIRA	Female\nCLAIR	Female\nCLAIRE	Female\nCLARA	Female\nCLARE	Female\nCLARENCE	Female\nCLARETHA	Female\nCLARETTA	Female\nCLARIBEL	Female\nCLARICE	Female\nCLARINDA	Female\nCLARINE	Female\nCLARIS	Female\nCLARISA	Female\nCLARISSA	Female\nCLARITA	Female\nCLASSIE	Female\nCLAUDE	Female\nCLAUDETTE	Female\nCLAUDIA	Female\nCLAUDIE	Female\nCLAUDINE	Female\nCLELIA	Female\nCLEMENCIA	Female\nCLEMENTINA	Female\nCLEMENTINE	Female\nCLEMMIE	Female\nCLEO	Female\nCLEOPATRA	Female\nCLEORA	Female\nCLEOTILDE	Female\nCLETA	Female\nCLORA	Female\nCLORINDA	Female\nCLOTILDE	Female\nCLYDE	Female\nCODI	Female\nCODY	Female\nCOLBY	Female\nCOLEEN	Female\nCOLENE	Female\nCOLETTA	Female\nCOLETTE	Female\nCOLLEEN	Female\nCOLLEN	Female\nCOLLENE	Female\nCOLLETTE	Female\nCONCEPCION	Female\nCONCEPTION	Female\nCONCETTA	Female\nCONCHA	Female\nCONCHITA	Female\nCONNIE	Female\nCONSTANCE	Female\nCONSUELA	Female\nCONSUELO	Female\nCONTESSA	Female\nCORA	Female\nCORAL	Female\nCORALEE	Female\nCORALIE	Female\nCORAZON	Female\nCORDELIA	Female\nCORDIA	Female\nCORDIE	Female\nCOREEN	Female\nCORENE	Female\nCORETTA	Female\nCOREY	Female\nCORI	Female\nCORIE	Female\nCORINA	Female\nCORINE	Female\nCORINNA	Female\nCORINNE	Female\nCORLISS	Female\nCORNELIA	Female\nCORRIE	Female\nCORRIN	Female\nCORRINA	Female\nCORRINE	Female\nCORRINNE	Female\nCORTNEY	Female\nCORY	Female\nCOURTNEY	Female\nCREOLA	Female\nCRIS	Female\nCRISELDA	Female\nCRISSY	Female\nCRISTA	Female\nCRISTAL	Female\nCRISTEN	Female\nCRISTI	Female\nCRISTIE	Female\nCRISTIN	Female\nCRISTINA	Female\nCRISTINE	Female\nCRISTY	Female\nCRUZ	Female\nCRYSTA	Female\nCRYSTAL	Female\nCRYSTLE	Female\nCUC	Female\nCURTIS	Female\nCYNDI	Female\nCYNDY	Female\nCYNTHIA	Female\nCYRSTAL	Female\nCYTHIA	Female\nDACIA	Female\nDAGMAR	Female\nDAGNY	Female\nDAHLIA	Female\nDAINA	Female\nDAINE	Female\nDAISEY	Female\nDAISY	Female\nDAKOTA	Female\nDALE	Female\nDALENE	Female\nDALIA	Female\nDALILA	Female\nDALLAS	Female\nDAMARIS	Female\nDAN	Female\nDANA	Female\nDANAE	Female\nDANELLE	Female\nDANETTE	Female\nDANI	Female\nDANIA	Female\nDANICA	Female\nDANIEL	Female\nDANIELA	Female\nDANIELE	Female\nDANIELL	Female\nDANIELLA	Female\nDANIELLE	Female\nDANIKA	Female\nDANILLE	Female\nDANITA	Female\nDANN	Female\nDANNA	Female\nDANNETTE	Female\nDANNIE	Female\nDANNIELLE	Female\nDANUTA	Female\nDANYEL	Female\nDANYELL	Female\nDANYELLE	Female\nDAPHINE	Female\nDAPHNE	Female\nDARA	Female\nDARBY	Female\nDARCEL	Female\nDARCEY	Female\nDARCI	Female\nDARCIE	Female\nDARCY	Female\nDARIA	Female\nDARLA	Female\nDARLEEN	Female\nDARLENA	Female\nDARLENE	Female\nDARLINE	Female\nDARNELL	Female\nDARYL	Female\nDAVID	Female\nDAVIDA	Female\nDAVINA	Female\nDAWN	Female\nDAWNA	Female\nDAWNE	Female\nDAYLE	Female\nDAYNA	Female\nDAYSI	Female\nDEADRA	Female\nDEAN	Female\nDEANA	Female\nDEANDRA	Female\nDEANDREA	Female\nDEANE	Female\nDEANN	Female\nDEANNA	Female\nDEANNE	Female\nDEB	Female\nDEBBI	Female\nDEBBIE	Female\nDEBBRA	Female\nDEBBY	Female\nDEBERA	Female\nDEBI	Female\nDEBORA	Female\nDEBORAH	Female\nDEBRA	Female\nDEBRAH	Female\nDEBROAH	Female\nDEDE	Female\nDEDRA	Female\nDEE	Female\nDEEANN	Female\nDEEANNA	Female\nDEEDEE	Female\nDEEDRA	Female\nDEENA	Female\nDEETTA	Female\nDEIDRA	Female\nDEIDRE	Female\nDEIRDRE	Female\nDEJA	Female\nDELAINE	Female\nDELANA	Female\nDELCIE	Female\nDELENA	Female\nDELFINA	Female\nDELIA	Female\nDELICIA	Female\nDELILA	Female\nDELILAH	Female\nDELINDA	Female\nDELISA	Female\nDELL	Female\nDELLA	Female\nDELMA	Female\nDELMY	Female\nDELOIS	Female\nDELOISE	Female\nDELORA	Female\nDELORAS	Female\nDELORES	Female\nDELORIS	Female\nDELORSE	Female\nDELPHA	Female\nDELPHIA	Female\nDELPHINE	Female\nDELSIE	Female\nDELTA	Female\nDEMETRA	Female\nDEMETRIA	Female\nDEMETRICE	Female\nDEMETRIUS	Female\nDENA	Female\nDENAE	Female\nDENEEN	Female\nDENESE	Female\nDENICE	Female\nDENISE	Female\nDENISHA	Female\nDENISSE	Female\nDENITA	Female\nDENNA	Female\nDENNIS	Female\nDENNISE	Female\nDENNY	Female\nDENYSE	Female\nDEON	Female\nDEONNA	Female\nDESIRAE	Female\nDESIRE	Female\nDESIREE	Female\nDESPINA	Female\nDESSIE	Female\nDESTINY	Female\nDETRA	Female\nDEVIN	Female\nDEVON	Female\nDEVONA	Female\nDEVORA	Female\nDEVORAH	Female\nDIA	Female\nDIAMOND	Female\nDIAN	Female\nDIANA	Female\nDIANE	Female\nDIANN	Female\nDIANNA	Female\nDIANNE	Female\nDIEDRA	Female\nDIEDRE	Female\nDIERDRE	Female\nDIGNA	Female\nDIMPLE	Female\nDINA	Female\nDINAH	Female\nDINORAH	Female\nDION	Female\nDIONE	Female\nDIONNA	Female\nDIONNE	Female\nDIVINA	Female\nDIXIE	Female\nDODIE	Female\nDOLLIE	Female\nDOLLY	Female\nDOLORES	Female\nDOLORIS	Female\nDOMENICA	Female\nDOMINGA	Female\nDOMINICA	Female\nDOMINIQUE	Female\nDOMINQUE	Female\nDOMITILA	Female\nDOMONIQUE	Female\nDONA	Female\nDONALD	Female\nDONELLA	Female\nDONETTA	Female\nDONETTE	Female\nDONG	Female\nDONITA	Female\nDONNA	Female\nDONNETTA	Female\nDONNETTE	Female\nDONNIE	Female\nDONYA	Female\nDORA	Female\nDORATHY	Female\nDORCAS	Female\nDOREATHA	Female\nDOREEN	Female\nDORENE	Female\nDORETHA	Female\nDORETHEA	Female\nDORETTA	Female\nDORI	Female\nDORIA	Female\nDORIAN	Female\nDORIE	Female\nDORINDA	Female\nDORINE	Female\nDORIS	Female\nDORLA	Female\nDOROTHA	Female\nDOROTHEA	Female\nDOROTHY	Female\nDORRIS	Female\nDORTHA	Female\nDORTHEA	Female\nDORTHEY	Female\nDORTHY	Female\nDOT	Female\nDOTTIE	Female\nDOTTY	Female\nDOVIE	Female\nDREAMA	Female\nDREMA	Female\nDREW	Female\nDRUCILLA	Female\nDRUSILLA	Female\nDULCE	Female\nDULCIE	Female\nDUNG	Female\nDUSTI	Female\nDUSTY	Female\nDWANA	Female\nDYAN	Female\nEARLEAN	Female\nEARLEEN	Female\nEARLENE	Female\nEARLIE	Female\nEARLINE	Female\nEARNESTINE	Female\nEARTHA	Female\nEASTER	Female\nEBONI	Female\nEBONIE	Female\nEBONY	Female\nECHO	Female\nEDA	Female\nEDDA	Female\nEDDIE	Female\nEDELMIRA	Female\nEDEN	Female\nEDIE	Female\nEDITH	Female\nEDNA	Female\nEDRA	Female\nEDRIS	Female\nEDWARD	Female\nEDWINA	Female\nEDYTH	Female\nEDYTHE	Female\nEFFIE	Female\nEHTEL	Female\nEILEEN	Female\nEILENE	Female\nELA	Female\nELADIA	Female\nELAINA	Female\nELAINE	Female\nELANA	Female\nELANE	Female\nELANOR	Female\nELAYNE	Female\nELBA	Female\nELDA	Female\nELDORA	Female\nELEANOR	Female\nELEANORA	Female\nELEANORE	Female\nELEASE	Female\nELENA	Female\nELENE	Female\nELENI	Female\nELENOR	Female\nELENORA	Female\nELENORE	Female\nELEONOR	Female\nELEONORA	Female\nELEONORE	Female\nELFREDA	Female\nELFRIEDA	Female\nELFRIEDE	Female\nELIA	Female\nELIANA	Female\nELICIA	Female\nELIDA	Female\nELIDIA	Female\nELIN	Female\nELINA	Female\nELINOR	Female\nELINORE	Female\nELISA	Female\nELISABETH	Female\nELISE	Female\nELISHA	Female\nELISSA	Female\nELIZ	Female\nELIZA	Female\nELIZABET	Female\nELIZABETH	Female\nELIZBETH	Female\nELIZEBETH	Female\nELKE	Female\nELLA	Female\nELLAMAE	Female\nELLAN	Female\nELLEN	Female\nELLENA	Female\nELLI	Female\nELLIE	Female\nELLIS	Female\nELLY	Female\nELLYN	Female\nELMA	Female\nELMER	Female\nELMIRA	Female\nELNA	Female\nELNORA	Female\nELODIA	Female\nELOIS	Female\nELOISA	Female\nELOISE	Female\nELOUISE	Female\nELSA	Female\nELSE	Female\nELSIE	Female\nELSY	Female\nELVA	Female\nELVERA	Female\nELVIA	Female\nELVIE	Female\nELVINA	Female\nELVIRA	Female\nELWANDA	Female\nELYSE	Female\nELZA	Female\nEMA	Female\nEMELDA	Female\nEMELIA	Female\nEMELINA	Female\nEMELINE	Female\nEMELY	Female\nEMERALD	Female\nEMERITA	Female\nEMIKO	Female\nEMILEE	Female\nEMILIA	Female\nEMILIE	Female\nEMILY	Female\nEMMA	Female\nEMMALINE	Female\nEMMIE	Female\nEMMY	Female\nEMOGENE	Female\nENA	Female\nENDA	Female\nENEDINA	Female\nENEIDA	Female\nENID	Female\nENOLA	Female\nENRIQUETA	Female\nEPIFANIA	Female\nERA	Female\nERIC	Female\nERICA	Female\nERICKA	Female\nERIKA	Female\nERIN	Female\nERINN	Female\nERLENE	Female\nERLINDA	Female\nERLINE	Female\nERMA	Female\nERMELINDA	Female\nERMINIA	Female\nERNA	Female\nERNESTINA	Female\nERNESTINE	Female\nERYN	Female\nESMERALDA	Female\nESPERANZA	Female\nESSIE	Female\nESTA	Female\nESTEFANA	Female\nESTELA	Female\nESTELL	Female\nESTELLA	Female\nESTELLE	Female\nESTER	Female\nESTHER	Female\nESTRELLA	Female\nETHA	Female\nETHEL	Female\nETHELENE	Female\nETHELYN	Female\nETHYL	Female\nETSUKO	Female\nETTA	Female\nETTIE	Female\nEUFEMIA	Female\nEUGENA	Female\nEUGENE	Female\nEUGENIA	Female\nEUGENIE	Female\nEULA	Female\nEULAH	Female\nEULALIA	Female\nEUN	Female\nEUNA	Female\nEUNICE	Female\nEURA	Female\nEUSEBIA	Female\nEUSTOLIA	Female\nEVA	Female\nEVALYN	Female\nEVAN	Female\nEVANGELINA	Female\nEVANGELINE	Female\nEVE	Female\nEVELIA	Female\nEVELIN	Female\nEVELINA	Female\nEVELINE	Female\nEVELYN	Female\nEVELYNE	Female\nEVELYNN	Female\nEVETTE	Female\nEVIA	Female\nEVIE	Female\nEVITA	Female\nEVON	Female\nEVONNE	Female\nEWA	Female\nEXIE	Female\nFABIOLA	Female\nFAE	Female\nFAIRY	Female\nFAITH	Female\nFALLON	Female\nFANNIE	Female\nFANNY	Female\nFARAH	Female\nFARRAH	Female\nFATIMA	Female\nFATIMAH	Female\nFAUSTINA	Female\nFAVIOLA	Female\nFAWN	Female\nFAY	Female\nFAYE	Female\nFE	Female\nFELECIA	Female\nFELICA	Female\nFELICE	Female\nFELICIA	Female\nFELICIDAD	Female\nFELICITA	Female\nFELICITAS	Female\nFELIPA	Female\nFELISA	Female\nFELISHA	Female\nFERMINA	Female\nFERN	Female\nFERNANDA	Female\nFERNANDE	Female\nFERNE	Female\nFIDELA	Female\nFIDELIA	Female\nFILOMENA	Female\nFIONA	Female\nFLAVIA	Female\nFLETA	Female\nFLO	Female\nFLOR	Female\nFLORA	Female\nFLORANCE	Female\nFLORENCE	Female\nFLORENCIA	Female\nFLORENE	Female\nFLORENTINA	Female\nFLORETTA	Female\nFLORIA	Female\nFLORIDA	Female\nFLORINDA	Female\nFLORINE	Female\nFLORRIE	Female\nFLOSSIE	Female\nFLOY	Female\nFONDA	Female\nFRAN	Female\nFRANCE	Female\nFRANCENE	Female\nFRANCES	Female\nFRANCESCA	Female\nFRANCHESCA	Female\nFRANCIE	Female\nFRANCINA	Female\nFRANCINE	Female\nFRANCIS	Female\nFRANCISCA	Female\nFRANCISCO	Female\nFRANCOISE	Female\nFRANK	Female\nFRANKIE	Female\nFRANSISCA	Female\nFRED	Female\nFREDA	Female\nFREDDA	Female\nFREDDIE	Female\nFREDERICA	Female\nFREDERICKA	Female\nFREDIA	Female\nFREDRICKA	Female\nFREEDA	Female\nFREIDA	Female\nFRIDA	Female\nFRIEDA	Female\nFUMIKO	Female\nGABRIEL	Female\nGABRIELA	Female\nGABRIELE	Female\nGABRIELLA	Female\nGABRIELLE	Female\nGAIL	Female\nGALA	Female\nGALE	Female\nGALINA	Female\nGARNET	Female\nGARNETT	Female\nGARY	Female\nGAY	Female\nGAYE	Female\nGAYLA	Female\nGAYLE	Female\nGAYLENE	Female\nGAYNELL	Female\nGAYNELLE	Female\nGEARLDINE	Female\nGEMA	Female\nGEMMA	Female\nGENA	Female\nGENE	Female\nGENESIS	Female\nGENEVA	Female\nGENEVIE	Female\nGENEVIEVE	Female\nGENEVIVE	Female\nGENIA	Female\nGENIE	Female\nGENNA	Female\nGENNIE	Female\nGENNY	Female\nGENOVEVA	Female\nGEORGANN	Female\nGEORGE	Female\nGEORGEANN	Female\nGEORGEANNA	Female\nGEORGENE	Female\nGEORGETTA	Female\nGEORGETTE	Female\nGEORGIA	Female\nGEORGIANA	Female\nGEORGIANN	Female\nGEORGIANNA	Female\nGEORGIANNE	Female\nGEORGIE	Female\nGEORGINA	Female\nGEORGINE	Female\nGERALD	Female\nGERALDINE	Female\nGERALYN	Female\nGERDA	Female\nGERI	Female\nGERMAINE	Female\nGERRI	Female\nGERRY	Female\nGERTHA	Female\nGERTIE	Female\nGERTRUD	Female\nGERTRUDE	Female\nGERTRUDIS	Female\nGERTUDE	Female\nGHISLAINE	Female\nGIA	Female\nGIANNA	Female\nGIDGET	Female\nGIGI	Female\nGILBERTE	Female\nGILDA	Female\nGILLIAN	Female\nGILMA	Female\nGINA	Female\nGINETTE	Female\nGINGER	Female\nGINNY	Female\nGIOVANNA	Female\nGISELA	Female\nGISELE	Female\nGISELLE	Female\nGITA	Female\nGIUSEPPINA	Female\nGLADIS	Female\nGLADY	Female\nGLADYS	Female\nGLAYDS	Female\nGLENDA	Female\nGLENDORA	Female\nGLENN	Female\nGLENNA	Female\nGLENNIE	Female\nGLENNIS	Female\nGLINDA	Female\nGLORIA	Female\nGLORY	Female\nGLYNDA	Female\nGLYNIS	Female\nGOLDA	Female\nGOLDEN	Female\nGOLDIE	Female\nGRACE	Female\nGRACIA	Female\nGRACIE	Female\nGRACIELA	Female\nGRAYCE	Female\nGRAZYNA	Female\nGREGORIA	Female\nGREGORY	Female\nGRETA	Female\nGRETCHEN	Female\nGRETTA	Female\nGRICELDA	Female\nGRISEL	Female\nGRISELDA	Female\nGUADALUPE	Female\nGUDRUN	Female\nGUILLERMINA	Female\nGUSSIE	Female\nGWEN	Female\nGWENDA	Female\nGWENDOLYN	Female\nGWENN	Female\nGWYN	Female\nGWYNETH	Female"),
		"lastnames": loadTSV("lastnames",["lastname"],
			"SMITH\nJONES\nTAYLOR\nWILLIAMS\nBROWN\nDAVIES\nEVANS\nWILSON\nTHOMAS\nROBERTS\nJOHNSON\nLEWIS\nWALKER\nROBINSON\nWOOD\nTHOMPSON\nWHITE\nWATSON\nJACKSON\nWRIGHT\nGREEN\nHARRIS\nCOOPER\nKING\nLEE\nMARTIN\nCLARKE\nJAMES\nMORGAN\nHUGHES\nEDWARDS\nHILL\nMOORE\nCLARK\nHARRISON\nSCOTT\nYOUNG\nMORRIS\nHALL\nWARD\nTURNER\nCARTER\nPHILLIPS\nMITCHELL\nPATEL\nADAMS\nCAMPBELL\nANDERSON\nALLEN\nCOOK\nMULLER\nSCHMIDT\nSCHNEIDER\nFISCHER\nMEYER\nWEBER\nSCHULZ\nWAGNER\nBECKER\nHOFFMANN\nPAPADOPOULOS\nVLAHOS\nANGELOPOULOS\nNIKOLAIDIS\nGEORGIOU\nPETRIDIS\nATHANASIADIS\nDIMITRIADIS\nPAPADAKIS\nPANAGIOTOPOULOS\nPAPANTONIOU\nCONSTANTINOU\nMURPHY\nMAC MURCHAIDH\nO' KELLY\nO'SULLIVAN\nWALSH\nSMITH\nO'BRIEN\nO'BYRNE\nO'RYAN\nO'MAOILRIAIN\nO'RUAIDH�N\nMAOILRIAGHAN\nRUAIDHIN\nO'CONNOR\nO'NEILL\nO'REILLY\nDOYLE\nMCCARTHY\nO'GALLAGHER\nO'DOHERTY\nKENNEDY\nLYNCH\nMURRAY\nMAC GIOLLA MHUIRE\nO'QUINN\nO'MOORE\nROSSI\nRUSSO\nFERRARI\nESPOSITO\nBIANCHI\nROMANO\nCOLOMBO\nRICCI\nMARINO\nGRECO\nBRUNO\nGALLO\nCONTI\nDE LUCA\nCOSTA\nGIORDANO\nMANCINI\nRIZZO\nLOMBARDI\nMORETTI\nDE JONG\nJANSEN\nDE VRIES\nVAN DEN BERG\nVAN DIJK\nBAKKER\nJANSSEN\nVISSER\nSMIT\nMEIJER\nDE BOER\nMULDER\nDE GROOT\nBOS\nVOS\nPETERS\nHENDRIKS\nVAN LEEUWEN\nDEKKER\nBROUWER\nDE WIT\nDIJKSTRA\nSMITS\nDE GRAAF\nVAN DER MEER\nSMIRNOV\nIVANOV\nKUZNETSOV\nPOPOV\nSOKOLOV\nLEBEDEV\nKOZLOV\nNOVIKOV\nMOROZOV\nPETROV\nVOLKOV\nSOLOVYOV\nVASILYEV\nZAYTSEV\nPAVLOV\nSEMYONOV\nGOLUBEV\nVINOGRADOV\nBOGDANOV\nVOROBYOV\nWANG\nCHAN\nLI\nLAI\nCHEN\nWONG\nNG\nLIU\nLAU\nZHANG\nLAM\nLEUNG\nHO\nLEE\nLO\nHAN"),
		"nations": loadTSV("nations",["name","code"],
			"Australia	AU\nBolivia	BO\nBrasil	BR\nChile	CH\nChina	CN\nCuba	CU\nDenmark	DK\nDubai	UA\nEcuador	EC\nFrance	FR\nGermany	GR\nHong Kong	HK\nIndonesia	ID\nNetherlands	HO\nNew Zealand	NZ\nNorth Korea	NK\nRussia	RU\nSingapore	SG\nSouth Korea	RK\nSpain	ES\nSwitzerland	CH\nUnited Kingdom	GB\nUnited States	US\nVenezeula	VZ"),
		"watchlist": loadTSV("watchlist",["npc_id","gender","firstname","lastname","category","organisation","status","date_of_birth","occupation","country_of_birth","residence","start","uses_aliases","nationality"],
			"1	Male	Edward	Snowden	Target	Ronin	Wanted	21-Jun-1983	Systems Analyst	United States	Russia	DME	Y\tRU\n"+
			"2	Male	Julian	Assange	Spymaster	Wikileaks	In Hiding	03-Jul-1971	Celebrety	Australia	Ecuador / London	LHR	Y\tAU\n"+
			"3	Female	Sarah	Harrison	Activist	Wikileaks	At large	Unknown	Lawyer	United Kingdom	United Kingdom	LHR	N\tGB\n"+
			"4	Male	Ricardo	Patino	Gov Minister	Ecuador Gov	Diplomatic Immunity	16-May-1955	Politican	Ecuador	Ecuador / London	UIO	N\tEC\n"+
			"5	Male	Mark	Stephens	Activist	Wikileaks	At large	07-Apr-1957	Lawyer	United Kingdom	United Kingdom	LHR	N\tGB\n"+
			"6	Male	Simon	Rogers	Activist	Guardian Newspaper	At large	Unknown	Journelist	United Kingdom	United Kingdom	CDG	N\tGB\n"+
			"7	Male	Glenn	Greenwood	Activist	Guardian Newspaper	At large	Unknown	Journelist	United Kingdom	United Kingdom	GRU	N\tGB\n"+
			"8	Male	David M	Miranda	Courier	Guardian Newspaper	At large	Unknown	Unknown	Brasil	Brasil	GRU	N\tBR"),
	},
	targets = {},
	flights = {},
	airports = {},
	agents = [],
	messages = {
		plot1: {
			from:"Message_Intercepts@nsa.gov",
			to:'<font color="dimgray">ALL AGENTS</font>',
			src:"Intercept",
			subject:"wikileaks movements",
			body:
				"<p><i>Source:</i> decryption of client-confidential email between law firms</p>"+
				"<p><i>Interpretation:</i> Assange and Harrison are on the move, likely RV with Snowden in (restaurant?)</i></p>"+
				"<p><i>Original text:</i> Dear Mr Chlorex, it is my greatest honour to inform you that bunny and kangaroo are going to a Latin restaurant tonight with Edwina</i></p>",
	
		},
		mission: {
			subject: "IMPORTANT: your mission",
			to: playerName,
			from: "NSA Director (GEN Keith B. Alexander)",
			body:
				"<h3>WARNING ORDER: RONIN AGENT ALERT!!!<br/>"+
				"THIS IS NOT A DRILL, REPEAT, NOT A DRILL!!!</h3>"+
				"<p>Recent email intelligence indicates that dangerous freedom activist Edward Snowden may attempt to flee Moscow by means of commercial air transport in the coming minutes. His aim is to rendezvous with hostile forces and deliver his anti-American payload of thumb drives, DVDs and floppy discs to enemy Wikileaks operatives in person.</p>"+
				"<p>If delivered, this payload may cause considerable embarrassment to our corporate overlords. This development follows a recent successful British Security Service (MI5) operation to intercept the previous courier at Heathrow Airport in London (the one in Europe, not Ontario).</p>"+
				"<p>It is considered likely that he is attempting to rendezvous with Wikileaks spymaster Julian Assange, but this is not to be assumed as certain. English left-wing neo-communist journalists may attempt to aide him. Right-wing neo-republican American press may also attempt to intercept him and randomly distribute the word Bengharzi thoughout his files for reasons unknown.</p>"+
				"<p>Your mission, if you chose to accept it, is to capture, kill or destroy the RONIN.</p>"+
				"<p>You will need to use this Cyber Remote Analyst Portal (CRAP) to coordinate your interception assets. For this mission, you have been assigned two field agents.  Get either of them onto the same plane as Snowden or any of the other people of interest and they should be spot them straight away!</p>"+
				"<p>Good luck agent. Remember, the future safety of the entire agency's bonus budget rests upon your shoulders!</p>",
		},
	};
