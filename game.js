	
function gameWorker(cmd) {
	switch(cmd.cmd) {
	case "init":
		generateGame(0);
		return {};
	case "start":
		playerName = cmd.playerName;
		zeroHour = now();
		gameSim();
		return {
			zeroHour: zeroHour,
			watchlist: tableData.watchlist,
			tasks: [{
				type:"addMessage",
				message:messages.plot1,
			},{
				type:"addMessage",
				message:messages.mission,
			}],
		};
	case "sql":
		var sql = cmd.sql.toLowerCase().trim();
		if(sql[sql.length-1] == ';')
			sql = sql.substr(0,sql.length-1);
		sql = sql.replace(new RegExp('  ','g'),' ').trim();
		try {
			return SQL(sql+";",tableDefs,tableAccess,tableData,{
				literals:{ now: dateString(gameTime()), },});
		} catch(error) {
			console.log(error,error.stack);
			return { ok: false, error: ""+error, };
		}
	default:
		fail("unsupported game command: "+cmd.cmd);
		return null;
	}
}
