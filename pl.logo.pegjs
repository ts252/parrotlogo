start = prog

expr = cmp
	/ add
    
cmp = l:add _ "==" r:cmp { if(typeof(l) == "number" && typeof(r) == "number"){ return l == r} else return {type:"op", op:"==", l: l, r: r}}
	/ l:add _ ">" r:cmp { if(typeof(l) == "number" && typeof(r) == "number"){ return l > r} else return {type:"op", op:">", l: l, r: r}}
    / l:add _ "<" r:cmp { if(typeof(l) == "number" && typeof(r) == "number"){ return l < r} else return {type:"op", op:"<", l: l, r: r}}
    / l:add _ "<=" r:cmp { if(typeof(l) == "number" && typeof(r) == "number"){ return l <= r} else return {type:"op", op:"<=", l: l, r: r}}
    / l:add _ ">=" r:cmp { if(typeof(l) == "number" && typeof(r) == "number"){ return l >= r} else return {type:"op", op:">=", l: l, r: r}}
    / l:add _ "!=" r:cmp { if(typeof(l) == "number" && typeof(r) == "number"){ return l != r} else return {type:"op", op:"!=", l: l, r: r}}
	/ add

add = l:mul _ "+" r:add { if(typeof(l) == "number" && typeof(r) == "number"){ return l + r} else return {type:"op", op:"+", l: l, r: r}}
	/ l:mul wsl:_ "-" wsr:_ &{return wsr != "" || wsl == ""} r:add { if(typeof(l) == "number" && typeof(r) == "number"){ return l - r} else return {type:"op", op:"-", l: l, r: r}}
	/ mul

mul = l:pri _ "*" r: mul { if(typeof(l) == "number" && typeof(r) == "number"){ return l * r} else return {type:"op", op:"*", l: l, r: r}}
	/ l:pri _ "/" r: mul { if(typeof(l) == "number" && typeof(r) == "number"){ return l / r} else return {type:"op", op:"/", l: l, r: r}}
	/ pri

pri = _ "(" inner:add _ ")" { return inner }
	/ val
    
val = param:param {return {type:"param", name:param}}
	/ num

num = _ sign? _ integer decimal? { return parseFloat(text().replace(/\s*/g, "")); }

sign = "-"

integer = [0-9]+

decimal = "." [0-9]+ 

_ "whitespace"
  = [ \t\n\r]* { return text() ? " " : "" }
    
prog = blocks:tlblock+ _ {return blocks}

tlblock = proc 
	/ block

block = ctrl:ctrl _ {return ctrl}
	/stmt:stmt {return stmt}
    
ctrl = if
	/rpt
    
rpt = "rpt" _ expr:expr _ list:list { return { type: "rpt", expr: expr, children: list }}

if = "if" _ expr:expr _ iflist:list _ elselist:else? { return { type: "if", expr: expr, ifchildren: iflist, elsechildren: elselist }}

else = "else" _ list:list { return list }

list = "[" _ blocks:block* "]" { return blocks }
    
proc = "to" _ fnname:label _ params:param* blocks:block* _ "end" _ { return { type: "fndecl", params: params, name: fnname, children: blocks }}

stmt = _ bi:builtin _ {return bi}
	/ _ fnc:fncall _ {return fnc}
    
builtin = fn:unary _ expr:expr { return { type:"call", fn: fn, param: expr}}
  / fn:nullad { return { type:"call", fn: fn}}
  / fn:strfn _ strlit:strlit { return { type:"call", fn: fn, param: strlit}}
  
unary = "fd"
	/ "bk"
    / "rt"
    / "lt"
    / "setpensize"
    
nullad = "pu"
 	/ "pd"
 	/ "st"
 	/ "ht"
    / "home"
    / "clean"
    
fncall = !keyword name:label params:expr* {return {type:"usercall", name:name, params: params}}

keyword = _ bare:kw _ { return bare }
kw = "to" / "end" / unary / nullad

strfn = "setpc"

strlit = "'" lit:[_a-zA-Z0-9]* {return lit.join("")}

label = [_a-zA-Z][_a-zA-Z0-9]* { return text() }

param = _ ":" label:label _ { return label }
