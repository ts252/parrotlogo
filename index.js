/*global CodeMirror,TogetherJS,LogoInterpreter,CanvasTurtle,Dialog*/
//
// Logo Interpreter in Javascript
//

// Copyright (C) 2021 Annie and Tom Sillence
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0

// Copyright (C) 2011-2015 Joshua Bell
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }

// Globals
var editor;

//
// Input UI
//
var input = {};
function initInput() {

  function keyNameForEvent(e) {
    window.ke = e;
    return e.key ||
      ({
        3: 'Enter', 10: 'Enter', 13: 'Enter',
        38: 'ArrowUp', 40: 'ArrowDown', 63232: 'ArrowUp', 63233: 'ArrowDown'
      })[e.keyCode];
  }

  function animate(v) {
    if ($("#turbo").checked) {
      return v;
    }

    return v.replace(/(fd|bk)\s+(\d+)/ig, (substr, g1, g2) => {
      let steps = Math.ceil(g2 / 10)
      if (steps > -1) {
        return `rpt ${steps} [${g1} ${g2 / steps} wait 1]`
      } else {
        return substr
      }
    }).replace(/(lt|rt)\s+(\d+)/ig, (substr, g1, g2) => {
      let steps = Math.ceil(g2 / 10)
      if (steps > -1) {
        return `rpt ${steps} [${g1} ${g2 / steps} wait 1]`
      } else {
        return substr
      }
    })
  }

  function run(code) {

    var error = $('#display #error');
    error.classList.remove('shown');

    var v = code || input.getValue();
    if (v === '') {
      return;
    }
    //commandHistory.push(v);

    setTimeout(function () {
      document.body.classList.add('running');
      parrotlogo.run(animate(v)).catch(function (e) {
        error.innerHTML = '';
        error.appendChild(document.createTextNode(e.message));
        error.classList.add('shown');
      }).then(function () {
        document.body.classList.remove('running');
      });
    }, 100);
  }

  function stop() {
    parrotlogo.bye();
    document.body.classList.remove('running');
  }

  input.run = run;

  function clear() {
    parrotlogo.run("home clean setpc 'black setpensize 1 st pd")
  }
  input.clear = clear;


  var BRACKETS = '()[]{}';

  editor = CodeMirror.fromTextArea($('#logo-ta-multi-line'), {
    autoCloseBrackets: false,
    matchBrackets: true,
    lineComment: ';',
    lineNumbers: false,
    showCursorWhenSelecting: true
  });
  $('#logo-ta-multi-line + .CodeMirror').id = 'logo-cm-multi-line';
  editor.setSize('100%', '100%');

  // Handle ctrl+enter in Multi-Line
  editor.on('keydown', function (instance, event) {
    if (keyNameForEvent(event) === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      if (document.body.classList.contains("running")) {
        stop();
      } else {
        run();
      }
    }
  });

  editor.on('mousedown', (inst, evt) => {
    if (evt.target.classList.contains("runnable")) {
      run(evt.target.getAttribute("data-procsrc"))
    }
  })

  function offsetFrom(el, parent) {
    rv = 0;
    while (el.parentElement && el.parentElement != parent) {
      rv += el.offsetTop
      el = el.parentElement
    }
    return rv;
  }

  $("#turbo").onchange = () => {
    localStorage.setItem("parrotlogo.turbo", $("#turbo").checked)
  }

  $("#hidehelp").onclick = () => {
    $("#help").classList.toggle("collapsed")
  }

  $("#togglecode").onclick = () => {
    $("#input-panel").classList.toggle("expanded")
  }

  function getLineAndChar(src, idx) {
    let lines = src.substr(0, idx).split("\n")
    return { line: lines.length - 1, ch: lines[lines.length - 1].length }
  }

  $("#newproc").onclick = () => {
    let re = /(end)?((?:.(?!end))*$)/si
    let src = editor.getValue()
    let landc = getLineAndChar(src, src.match(re).index)
    editor.setValue(src.replace(re, ("$1\n\nto MYNEWPROC \n\nend\n\n$2")))
    editor.setSelection({ line: landc.line + 10, ch: 0 })
    editor.setSelection({ line: landc.line, ch: 0 })

    editor.setSelection({ line: landc.line + 2, ch: 3 }, { line: landc.line + 2, ch: 12 })
    editor.focus()
  }

  editor.on("change", () => {
    setTimeout(() => {
      window.procsrc = ""
      $("#myprocs ul").innerHTML = "";
      let src = editor.getValue();

      for (let match of src.matchAll(/\s*to\s+(\S+)((?:\s+:\S+)*)(?:.(?!end))*.end\s*/smig)) {
        let proc = match[1];
        window.procsrc += "\n" + match[0]

        let li = document.createElement("li")
        if (match[2].trim() == "") {
          li.innerHTML = `${proc} <div class="smbutton"><i class="fa fa-edit"></i></div> <div class="smbutton"><i class="fa fa-play"></i></div>`
          li.querySelector(".fa-play").onclick = () => { run(window.procsrc + "\n" + proc) };
        } else {
          li.innerHTML = `${proc} <i class="param">${match[2].trim()}</i><div class="smbutton"><i class="fa fa-edit"></i></div></div>`
        }

        let leadinglines = src.substring(0, match.index).split("\n")
        let lineno = leadinglines.length - 1
        let charno = leadinglines[leadinglines.length - 1].length
        li.querySelector(".fa-edit").onclick = () => {

          editor.setSelection({ line: lineno + 10, ch: charno })
          editor.setSelection({ line: lineno, ch: charno })
          editor.setSelection({ line: lineno + 1, ch: charno })
          //editor.scrollIntoView({line: lineno,ch: charno}, 100)
          editor.focus()
        };
        $("#myprocs ul").appendChild(li)
      }


      localStorage.setItem("parrotlogo.currentEditor", editor.getValue())
    }, 100);
    return true
  });

  input.getValue = function () {
    return editor.getValue();
  };
  input.setValue = function (v) {
    editor.setValue(v);
  };
  input.setFocus = function () {
    editor.focus();
  };



  input.setFocus();
  $('#input').addEventListener('click', function () {
    input.setFocus();
  });

  $('#run').addEventListener('click', () => { run() });
  $('#stop').addEventListener('click', () => { stop() });
  $('#clear').addEventListener('click', () => { clear() });

  if (localStorage.getItem("parrotlogo.currentEditor") === null) {
    fetch("parrot.logo").then(d => d.text()).then(d => { editor.setValue(d) })
    $("#turbo").checked = false
    setTimeout(() => { run(procsrc + " welcome") }, 2000)
  } else {
    editor.setValue(localStorage.getItem("parrotlogo.currentEditor") || "")
    $("#turbo").checked = JSON.parse(localStorage.getItem("parrotlogo.turbo") || "false");
  }

  resize();

}

function resize() {
  var box = $('#display'), rect = box.getBoundingClientRect(),
    w = rect.width, h = rect.height;

  $('#turtle').width = w; $('#turtle').height = h;
  $('#sandbox').width = w; $('#sandbox').height = h;

  //@@@turtle.resize(w, h);
  
}

window.addEventListener('resize', resize);

window.addEventListener('DOMContentLoaded', function () {

  // Parse query string
  var queryParams = {}, queryRest;
  (function () {
    if (document.location.search) {
      document.location.search.substring(1).split('&').forEach(function (entry) {
        var match = /^(\w+)=(.*)$/.exec(entry);
        if (match)
          queryParams[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
        else
          queryRest = '?' + entry;
      });
    }
  }());


  var stream = {
    read: function (s) {
      return Dialog.prompt(s ? s : "");
    },
    write: function () {
      var div = $('#overlay');
      for (var i = 0; i < arguments.length; i += 1) {
        div.innerHTML += arguments[i];
      }
      div.scrollTop = div.scrollHeight;
    },
    clear: function () {
      var div = $('#overlay');
      div.innerHTML = "";
    },
    readback: function () {
      var div = $('#overlay');
      return div.innerHTML;
    },
    get textsize() {
      return parseFloat($('#overlay').style.fontSize.replace('px', ''));
    },
    set textsize(height) {
      $('#overlay').style.fontSize = Math.max(height, 1) + 'px';
    },
    get font() {
      return $('#overlay').style.fontFamily;
    },
    set font(name) {
      if (['serif', 'sans-serif', 'cursive', 'fantasy', 'monospace'].indexOf(name) === -1)
        name = JSON.stringify(name);
      $('#overlay').style.fontFamily = name;
    },
    get color() {
      return $('#overlay').style.color;
    },
    set color(color) {
      $('#overlay').style.color = color;
    }
  };

  initInput();

});

const parrotlogo = (() => {

  function hoist(parsetree, state) {
    for (let b of parsetree) {
      if (b.type == "fndecl") {
        state.procs[b.name] = {
          name: b.name,
          arity: b.params.length
        }
      }
    }

    function checkcall(n) {
      if (n.type == "usercall") {
        if (!(n.name in state.procs)) {
          throw {message: `Unknown procedure "${n.name}"`}
        }
        if (state.procs[n.name].arity != n.params.length) {
          throw {message: `"${n.name}" takes ${state.procs[n.name].arity} parameters, but ${n.params.length} were supplied`}
        }
      } else {        
        for (let ch of (n.children || []).concat( n.ifchildren || [], n.elsechildren || [])) {
          checkcall(ch)
        }        
      }
    }

    let notoplevel = true
    let nothing = true
    for (let n of parsetree) {
      checkcall(n)

      if(!["comment", "ws"].includes(n.type)){
        nothing = false
        if(n.type != "proc"){
          notoplevel = false;        
        }
      }      
    }

    if(nothing){
      throw {message: "Code contains no instructions"}
    }

    if(notoplevel){
      throw {message: "Code has only procedure definitions"}
    }
  }

  const gen = {
    any: (node, state) => {
      if (node.type) {
        return gen[node.type](node, state)
      } else {
        //primitive
        return JSON.stringify(node)
      }
    },

    comment: (proc, state) => {
      return ""
    },

    fndecl: (proc, state) => {
      let rv = `procs["${proc.name}"] = (${proc.params.map(x => "__" + x).join(", ")}) => {`
      for (let b of proc.children) {
        rv += gen.any(b, state)
      }
      rv += "}\n";

      return rv
    },

    param: (param, state) => {
      return "__" + param.name
    },

    call: (call, state) => {
      if("param" in call){
        return turtleops[call.fn](gen.any(call.param, state)) + "\n"
      } else {
        return turtleops[call.fn]() + "\n"
      }
    },

    usercall: (call, state) => {
      return `procs["${call.name}"](${call.params.map(x => gen.any(x, state)).join(", ")});\n`
    },

    if: (ifexpr, state) => {
      let rv = `if(${gen.any(ifexpr.expr)}){\n`
      for (let b of ifexpr.ifchildren) {
        rv += gen.any(b, state)
      }
      rv += "}"
      if (ifexpr.elsechildren && ifexpr.elsechildren.length) {
        rv += "else {"
      
        for (let b of ifexpr.elsechildren) {
          rv += gen.any(b, state)
        }
        rv += "}"
      }
      return rv
    },

    rpt: (rpt, state) => {
      let rv = `for(let __loop = 0; __loop < (${gen.any(rpt.expr)}); __loop++){\n`
      for (let b of rpt.children) {
        rv += gen.any(b, state)
      }
      return rv + "}\n"
    },

    op: (op, state) => {
      return ` (${gen.any(op.l, state)}) ${op.op} (${gen.any(op.r, state)}) `
    }
  }

  const PALETTE = {
    0: "black", 1: "blue", 2: "lime", 3: "cyan",
    4: "red", 5: "magenta", 6: "yellow", 7: "white",
    8: "brown", 9: "tan", 10: "green", 11: "aquamarine",
    12: "salmon", 13: "purple", 14: "orange", 15: "gray"
};

function parseColor(color) {
    if (color in PALETTE) {
        return PALETTE[color]
    }
    return color;
}


  const turtleops = {
    fd: (v) => `turtle.move(${v}); `,
    bk: (v) => `turtle.move(-(${v})); `,
    lt: (v) => `turtle.turn(-(${v})); `,
    rt: (v) => `turtle.turn(${v}); `,
    home: (v) => "turtle.home(); ",
    pd: () => "turtle.pendown=true; ",
    pu: () => "turtle.pendown=false; ",
    st: () => "turtle.visible=true; ",
    ht: () => "turtle.visible=false; ",
    clean: () => "turtle.clearscreen(); ",
    setpc: (color) => `turtle.color = ${parseColor(color)};`,
    setpensize: (a) => `turtle.penwidth = (${a}); `,
    wait: (a) => ""
}

  let w

  function codegen(src) {
    return new Promise((res, rej) => {
      src += "\n\n"
      console.debug(src)

      try {
        let parsetree = pegparser.parse(src)

        let state = {
          procs: {}
        }

        hoist(parsetree, state)

        let output = `"use strict"; let procs={}; `
        for (let n of parsetree) {
          output += gen.any(n, state)
        }

        console.debug(output)

        if (!w) {
          
        w = new Worker("parrotdrawer.js")
        
        let offscreen_sandbox = $("#sandbox").transferControlToOffscreen();
        let offscreen_turtle = $("#turtle").transferControlToOffscreen();
    
        w.postMessage({ 
            code: output, 
            sandbox: offscreen_sandbox, 
            turtle: offscreen_turtle, 
            w: $("#sandbox").width,
            h: $("#sandbox").height,
          }, 
          [offscreen_sandbox, offscreen_turtle])
        } else {
          w.postMessage({ 
            code: output})
        }

        w.onmessage = (msg) => {
          if (msg.data == "done") {            
            res();
            return
          }

          for (let op of msg.data) {
            parrotlogo[op.op](op.param)
          }
        }
      } catch (e) {
        rej(e)
        return
      }

    })
  }
  
  return {
    run: (src) => {
      return codegen(src)
    },
    bye: () => {
      if (w) {
        w.postMessage("terminate")
      }
    }
  }
})()