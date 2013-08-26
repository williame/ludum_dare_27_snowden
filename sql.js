"use strict";

function SQL(statement,tableDefs,tableAccess,tableData,params) {
	params = params || {};
	statement = statement.toLowerCase();
	var	start, stop = 0,
		token, terminator,
		startsWith = function(str,prefix) { return str.indexOf(prefix)==0; },
		endsWith = function(str,suffix) { return str.substr(str.length-suffix.length) == suffix; },
		remaining = function() {
			var start = stop;
			while(statement[start] == " ") start++;
			return statement.substr(start);
		},
		next = function() {
			while(statement[stop] == " ") stop++;
			start = stop;
			stop = -1;
			terminator = "";
			for(var arg in arguments) { // TODO also scan for quotes and, if found, skip their contents to avoid fake matches
				arg = arguments[arg];
				var curr = statement.indexOf(arg,start);
				if(curr != -1 && (stop == -1 || curr < stop || (curr == stop && arg.length>terminator.length))) {
					stop = curr;
					terminator = arg;
				}
			}
			if(stop == -1)
				throw new Error("expecting terminators "+Array.prototype.slice.call(arguments,0)+" after "+start);
			token = statement.substr(start,stop-start).trim();
			stop += terminator.length;
			return token;
		},
		isNumber = function(n) {
			return (!n.indexOf || n.indexOf(' ') == -1) && !isNaN(parseFloat(n)) && isFinite(n);
		},
		tables = [], tableAliases = {}, table,
		parseLiteral = function(str) {
			if(startsWith(str,'"') || startsWith(str,"'")) {
				if(str.length == 1 || str[0] != str[str.length-1])
					throw new Error("incorrect string literal");
				return str.substr(1,str.length-2).toUpperCase(); //TODO unescape?
			}
			if(isNumber(str))
				return parseFloat(str);
			switch(str) {
			case "true": return true;
			case "false": return false;
			case "null": return null;
			default:
				if("literals" in params && str in params.literals)
					return params.literals[str];
				return parseLiteral; // special code to say not a literal
			}
		},
		parseRef = function(str,allowWildcard) {
			var literal = parseLiteral(str);
			if(literal !== parseLiteral)
				return function(rows) { return literal; };
			if(str.indexOf(" ") != -1)
				throw new Error("unexpected space in "+str);
			var parts = str.split('.');
			if(parts.length > 2)
				throw new Error("unexpected . seperator in "+str);
			if(parts.length == 2) {
				return function(row) {
					if(!(parts[0] in row))
						throw new Error("table "+parts[0]+" is not in the FROM clause");
					row = row[parts[0]];
					if(!(parts[1] in row))
						throw new Error("table "+parts[0]+" does not have a column called "+parts[1]);
					return row[parts[1]];
				};
			}
			if(str.indexOf("*") != -1 && !allowWildcard)
				throw new Error("unexpected * symbol");
			return function(row) {
				if(tables.length != 1)
					throw new Error("column "+str+" must be qualified with a table name");
				row = row[tables[0]];
				if(!(str in row))
					throw new Error("table "+tables[0]+" does not have a column called "+str);
				return row[str];
			};
		},
		parseExpr = function() {
			var	lhs = parseRef(next("=","<>","<",">",">=","<=")),
				op = terminator,
				rhs = parseRef(next("and","or",")",";"," limit "));
			if(terminator != " limit ")
				stop -= terminator.length; // unconsume it
			return function(row) {
				switch(op) {
				case "=": return String(lhs(row)).toUpperCase() === String(rhs(row)).toUpperCase();
				case "<>": return String(lhs(row)).toUpperCase() !== String(rhs(row)).toUpperCase();
				case "<": return String(lhs(row)).toUpperCase() < String(rhs(row)).toUpperCase();
				case ">": return String(lhs(row)).toUpperCase() > String(rhs(row)).toUpperCase();
				case "<=": return String(lhs(row)).toUpperCase() <= String(rhs(row)).toUpperCase();
				case ">=": return String(lhs(row)).toUpperCase() >= String(rhs(row)).toUpperCase();
				default: throw new Error("unsupported operator "+op);
				}
			}
		},
		And = function(a,b) { return function(row) { return a(row) && b(row); }; },
		Or = function(a,b) { return function(row) { return a(row) || b(row); }; },
		parseWhere = function() {
			var lhs;
			if(startsWith(remaining(),'(')) {
				stop++;
				lhs = parseWhere(')');
				stop++;
			} else
				lhs = parseExpr();
			for(;;) {
				var peek = remaining();
				if(startsWith(peek,"and ")) {
					stop += 4;
					lhs = And(lhs,parseWhere());
				} else if(startsWith(peek,"or ")) {
					stop += 3;
					lhs = Or(lhs,parseWhere());
				} else 
					return lhs;
			}
		},
		cartesianProduct = function(func) {
			var	idx = [],
				results = [],
				done = false,
				recurse = function(i) {
					var table, row;
					if(i == tables.length) {
						row = {};
						for(i=0; i<tables.length; i++) {
							table = tables[i];
							row[table] = tableData[tableAliases[table]][idx[i]];
						}
						done = !func(row);
					} else {
						table = tableAliases[tables[i]];
						if(!(table in tableData))
							throw new Error("INTERNAL ERROR: "+table+" not in tableData!");
						table = tableData[table];
						for(row=0; row<table.length && !done; row++) {
							idx[i] = row;
							recurse(i+1);
						}
					}
				};
			recurse(0);
		},
		checkConstraints = function(tables) {
			for(var tableName in tables) {
				var def = tableDefs[tableName];
				var table = tables[tableName];
				var unique = {};
				for(var row in table) {
					row = table[row];
					for(var column in def) {
						if(!(column in row))
							throw new Error("column "+tableName+"."+column+" missing");
						if(row[column] === null && def[column].notNull)
							return "column "+tableName+"."+column+" cannot be null";
						if(row[column] != null && def[column].type) { // coerce MySQL-style
							switch(def[column].type) {
							case "string":
								row[column] = String(row[column]);
								break;
							case "integer":
								if(!isNumber(row[column]))
									return "column "+tableName+"."+column+" value "+row[column]+" must be numeric";
								row[column] = parseInt(row[column]);
								break;
							case "number":
								if(!isNumber(row[column]))
									return "column "+tableName+"."+column+" value "+row[column]+" must be numeric";
								row[column] = parseFloat(row[column]);
								break;
							default:
								throw new Error("unsupported "+tableName+"."+column+" type "+def[column].type);
							}
						}
						if(def[column].unique) {
							if(!(column in unique))
								unique[column] = {};
							if(row[column] in unique[column])
								return "column "+tableName+"."+column+" cannot have value "+row[column]+" twice";
							unique[column][row[column]] = true;
						}
					}
				}
			}
			return null;			
		},
		maxRows = ("maxRows" in params)? params.maxRows: 1000,
		remarks,
		results,
		i, j,
		column, columnAlias,
		columnNames = [], selectColumns = [],
		columnFilter = function(row) {
			var out = [];
			for(var i in selectColumns)
				out.push(selectColumns[i](row));
			results.push(out);
			if(maxRows && results.length >= maxRows) {
				remarks = "maximum row limit reached; results truncated";
				return false;
			}
			return true;
		};
	switch(next(" ")) {
		case "select":
			for(;;) {
				column = next(","," from "," as ");
				columnAlias = column;
				if(terminator == " as ") {
					columnAlias = next(","," from ");
				}
				columnNames.push(columnAlias);
				selectColumns.push(parseRef(column,true));
				if(terminator == " from ")
					break;
			}
			for(;;) {
				table = next(","," where "," as ",";"," limit ");
				if(!(table in tableDefs))
					throw new Error("table "+table+" does not exist");
				var tableAlias = table;
				if(terminator == " as ") {
					table = next(","," where ",";"," limit ");
					if(table.indexOf(".") != -1 || table.indexOf(" ") != -1)
						throw new Error("bad tableAlias "+table);
				}
				for(var i in tables)
					if(tables[i] == table)
						throw new Error("table "+table+" cannot occur more than once in the FROM clause");
				tables.push(table);
				tableAliases[table] = tableAlias;
				if(terminator != ",")
					break;
			}
			for(i = columnNames.length; i --> 0; ) {
				column = columnNames[i];
				if(column == "*") {
					columnNames.splice(i,1);
					selectColumns.splice(i,1);
					for(table in tables) {
						table = tables[table];
						var j = 0;
						for(var column in tableDefs[tableAliases[table]]) {
							columnNames.splice(i+j,0,tables.length==1?column:table+"."+column);
							selectColumns.splice(i+j,0,parseRef(table+"."+column));
							j++;
						}
					}
				} else if(endsWith(column,".*")) {
					table = column.substr(0,column.length-2);
					if(!(table in tableAliases))
						throw new Error("table "+table+" does not occur in the FROM clause");
					columnNames.splice(i,1);
					selectColumns.splice(i,1);
					j = 0;
					for(var column in tableDefs[tableAliases[table]]) {
						columnNames.splice(i+j,0,table+"."+column);
						selectColumns.splice(i+j,0,parseRef(table+"."+column));
						j++;
					}
				} else if(column.indexOf("*") != -1)
					throw new Error("unexpected * symbol");
			}
			results = [];
			var parseLimit = function() {
				var limit = parseLiteral(next(";"));
				if(!isNumber(limit))
					throw new Error("invalid limit "+token);
				maxRows = parseInt(limit);
				if(maxRows <= 0)
					throw new Error("invalid limit "+limit);
			};
			if(terminator == " where ") {
				var where = parseWhere();
				if(terminator == " limit ") parseLimit();
				cartesianProduct(function(row) { if(where(row)) return columnFilter(row); return true; });
			} else {
				if(terminator == " limit ") parseLimit();
				cartesianProduct(columnFilter);
			}
			if(terminator != ";") {
				stop -= terminator.length;
				throw new Error("expecting ;, got "+remaining());
			}
			break;
		case "desc":
		case "describe":
			table = next(";");
			if(!(table in tableDefs))
				throw new Error("table "+table+" does not exist");
			var readOnly = !tableAccess[table];
			table = tableDefs[table];
			columnNames = readOnly?["column","description"]:["column","type","description","unique?","not null?"];
			results = [];
			for(i in table) {
				column = table[i];
				results.push(readOnly?[i,column.description||""]:[i,column.type||"",column.description||"",!!column.unique,!!column.notNull]);
			}
			break;
		case "check":
			table = next(";");
			if(!(table in tableDefs))
				throw new Error("table "+table+" does not exist");
			columnNames = ["table","status","error message"];
			var error = {};
			error[table] = tableData[table];
			error = checkConstraints(error);
			results = [[table,!error,error]];
			break;
		case "show":
			if(next(";") != "tables")
				throw new Error("unexpected "+token);
			columnNames = ["table name"];
			results = [];
			for(table in tableDefs)
				results.push([table]);
			break;
		case "insert":
			if(next(" ") != "into")
				throw new Error("unexpected "+token);
			table = next("(");
			if(!(table in tableDefs))
				throw new Error("table "+table+" does not exist");
			if(!tableAccess[table])
				throw new Error("table "+table+" is read-only");
			columnNames = [];
			while(terminator != ")") {
				column = next(",",")");
				if(!(column in tableDefs[table]))
					throw new Error("table "+table+" has no column called "+column);
				columnNames.push(column);
			}
			if(next("(") != "values")
				throw new Error("unexpected "+token);
			var row = {};
			for(column in tableDefs[table])
				row[column] = null;
			for(i=0; i<columnNames.length; i++) {
				column = next(i==columnNames.length-1?")":",");
				if(startsWith(column,"'") || startsWith(column,'"')) {
					if(column.length == 1 || column[0] != column[column.length-1])
						throw new Error("badly terminated string literal: "+column);
					column = column.substr(1,column.length-2).toUpperCase();
				} else if(isNumber(column))
					column = parseFloat(column);
				else
					throw new Error("unsupported literal: "+column);
				row[columnNames[i]] = column;
			}
			if(remaining() != ";")
				throw new Error("unexpected characters after insert statement: "+remaining());
			tableData[table].push(row);
			var error = {};
			error[table] = tableData[table];
			error = checkConstraints(error);
			if(error) {
				tableData[table].pop();
				throw new Error(error);
			}
			columnNames = Object.keys(tableDefs[table]);
			results = [[]];
			for(column in columnNames)
				results[0].push(row[columnNames[column]]);
			break;
		case "delete":
			maxRows = false;
			if(next(" ") != "from")
				throw new Error("unexpected "+token);
			table = next(";","where");
			if(!(table in tableDefs))
				throw new Error("table "+table+" does not exist");
			if(!tableAccess[table])
				throw new Error("table "+table+" is read-only");
			tables = [table];
			tableAliases[table] = table;
			columnNames = Object.keys(tableDefs[table]); selectColumns = [];
			for(column in columnNames)
				selectColumns.push(parseRef(columnNames[column]));
			results = [];
			if(terminator == "where") {
				var where = parseWhere();
				if(terminator != ";") {
					stop -= terminator.length;
					throw new Error("expecting ;, got "+remaining());
				}
				i = 0;
				var hits = [];
				cartesianProduct(function(row) {
					if(where(row)) {
						columnFilter(row);
						hits.push(i);
					}
					i++;
					return true;
				});
				for(i = hits.length; i --> 0; )
					tableData[table].splice(hits[i],1);
			} else {
				if(terminator != ";") {
					stop -= terminator.length;
					throw new Error("expecting ;, got "+remaining());
				}
				cartesianProduct(columnFilter);
				tableData[table] = [];
			}
			break;
		case 'update':
			maxRows = false;
			table = next(" set ");
			if(!(table in tableDefs))
				throw new Error("table "+table+" does not exist");
			if(!tableAccess[table])
				throw new Error("table "+table+" is read-only");
			var updates = {};
			for(;;) {
				var column = next("=");
				if(!(column in tableDefs[table]))
					throw new Error("column "+table+"."+column+" does not exist");
				var literal = parseLiteral(next(","," where ",";"));
				if(literal === parseLiteral)
					throw new Error("column "+table+"."+column+" value <"+token+"> is not a literal");
				updates[column] = literal;
				if(terminator != ",") break;
			}
			tables = [table];
			tableAliases[table] = table;
			columnNames = Object.keys(tableDefs[table]); selectColumns = [];
			for(column in columnNames)
				selectColumns.push(parseRef(columnNames[column]));
			results = [];
			var hits = [], updated = tableData[table].slice(0);
			if(terminator == " where ") {
				var where = parseWhere();
				i = 0;
				cartesianProduct(function(row) { if(where(row)) hits.push(i); i++; return true; });
			} else
				hits = Object.keys(tableData[table]);
			if(terminator != ";") {
				stop -= terminator.length;
				throw new Error("expecting ;, got "+remaining());
			}
			for(i in hits) {
				var update = updated[hits[i]] = {};
				for(j in tableDefs[table])
					update[j] = j in updates? updates[j]: tableData[table][hits[i]][j];
				row = {};
				row[table] = update;
				columnFilter(row);
			}
			error = {};
			error[table] = updated;
			error = checkConstraints(error);
			if(error)
				throw error;
			tableData[table] = updated;
			break;
		default:
			throw new Error("unsupported statement type: "+token);
	}
	return {
		ok: true,
		columns: columnNames,
		rows: results,
		remarks: remarks,
	};
}
