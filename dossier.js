function Dossier(watchlist) {
	TabbedPane.call(this,{
		title:"Intel Dossier",
		resize:true,minimise:true,maximise:true,close:true,startMenu:true,show:true,
		icon:"icon_dossier.png",
	});
	watchlist.reverse();
	for(var target in watchlist) {
		target = watchlist[target];
		var tab = document.createElement('div');
		tab.className = "Dossier";
		var getFlights = makeButton("Get Flights");
		tab.appendChild(getFlights);
		(function(pass,fugitive) {
			getFlights.addEventListener('click',function() {
					prism.systemQuery(
						"SELECT F.*, M.REMARK"+
						" FROM FLIGHTS AS F, MANIFESTS AS M"+
						" WHERE M.PASS = '"+pass+"'"+
						" AND F.CODE = M.FLIGHT;",
						fugitive?"(Presumed to be travelling using an assumed identity)":null);
			});
		})(target.pass,target.uses_aliases == "Y");
		this.addTab(target.lastname,tab);
	}
}
Dossier.prototype = {
	__proto__: TabbedPane.prototype,
};
