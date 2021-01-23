/*global CodeMirror,TogetherJS,LogoInterpreter,CanvasTurtle,Dialog*/
//
// Logo Interpreter in Javascript
//

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

if (!('console' in window)) {
  window.console = { log: function () { }, error: function () { } };
}

function $(s) { return document.querySelector(s); }
function $$(s) { return document.querySelectorAll(s); }

// Globals
var logo, turtle, editor;

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

  function animate(v){
    if($("#turbo").checked){
      return v;
    }

    return v.replace(/(fd|bk)\s+(\d+)/ig, (substr, g1, g2) => {
      let steps = Math.ceil(g2 / 10)
      if(steps > 1){
        return `repeat ${steps} [${g1} ${g2/steps} wait 1]`
      } else {
        return substr
      }
    }).replace(/(lt|rt)\s+(\d+)/ig, (substr, g1, g2) => {
      let steps = Math.ceil(g2 / 10)
      if(steps > 1){
        return `repeat ${steps} [${g1} ${g2/steps} wait 1]`
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
      logo.run(animate(v)).catch(function (e) {
        error.innerHTML = '';
        error.appendChild(document.createTextNode(e.message));
        error.classList.add('shown');
      }).then(function () {
        document.body.classList.remove('running');
      });
    }, 100);
  }

  function stop() {
    logo.bye();
    document.body.classList.remove('running');
  }

  input.run = run;

  function clear() {
    logo.run("home clearscreen setpc 'black setpensize 1 st pd")
  }
  input.clear = clear;


  var BRACKETS = '()[]{}';

  editor = CodeMirror.fromTextArea($('#logo-ta-multi-line'), {
    autoCloseBrackets: { pairs: BRACKETS, explode: BRACKETS },
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
      run();
    }
  });

  editor.on('mousedown', (inst, evt) => {
    if (evt.target.classList.contains("runnable")) {
      run(evt.target.getAttribute("data-procsrc"))
    }
  })

  function offsetFrom(el, parent){
    rv = 0;
    while(el.parentElement && el.parentElement != parent){
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

  function getLineAndChar(src, idx){
    let lines = src.substr(0, idx).split("\n")
    return {line: lines.length - 1, ch: lines[lines.length - 1].length}
  }

  $("#newproc").onclick = () => {
    let re = /(end)\s((?:.(?!end))*$)/si
    let src = editor.getValue()
    let landc = getLineAndChar(src, src.match(re).index)
    editor.setValue(src.replace(re, ("$1\n\nto MYNEWPROC \n\nend\n\n$2")))
    editor.setSelection({line: landc.line + 10,ch: 0})
    editor.setSelection({line: landc.line, ch: 0})    
    
    editor.setSelection({line: landc.line + 2, ch: 3}, {line: landc.line + 2,ch: 12})
    editor.focus()
  }

  editor.on("change", () => {
    setTimeout(() => {
      window.procsrc = ""
      $("#myprocs ul").innerHTML = "";   
      let src = editor.getValue();   
      for (let match of src.matchAll(/\s*to\s+(\S+)((?:\s+:\S+)*)(?:.(?!end))*.end\s*/smig)){
        console.debug(match)
        let proc = match[1];
        window.procsrc += "\n" + match[0] 
        
        let li = document.createElement("li")
        if(match[2].trim() == ""){
          li.innerHTML = `${proc} <div class="smbutton"><i class="fa fa-edit"></i></div> <div class="smbutton"><i class="fa fa-play"></i></div>`       
          li.querySelector(".fa-play").onclick = () => { run(window.procsrc + " " + proc) };
        } else {
          li.innerHTML = `${proc} <i class="param">${match[2].trim()}</i><div class="smbutton"><i class="fa fa-edit"></i></div></div>`                 
        }

        let leadinglines = src.substring(0, match.index).split("\n")
        let lineno = leadinglines.length - 1
        let charno = leadinglines[leadinglines.length - 1].length
        li.querySelector(".fa-edit").onclick = () => {          
          
          editor.setSelection({line: lineno+10,ch: charno})
          editor.setSelection({line: lineno, ch: charno})
          editor.setSelection({line: lineno+1, ch: charno})
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

  editor.setValue(localStorage.getItem("parrotlogo.currentEditor") || "")
  $("#turbo").checked = JSON.parse(localStorage.getItem("parrotlogo.turbo") || "false");

}


//
// Canvas resizing
//
(function () {
  window.addEventListener('resize', resize);
  window.addEventListener('DOMContentLoaded', resize);
  function resize() {
    var box = $('#display'), rect = box.getBoundingClientRect(),
      w = rect.width, h = rect.height;
    $('#sandbox').width = w; $('#sandbox').height = h;
    $('#turtle').width = w; $('#turtle').height = h;
    $('#overlay').width = w; $('#overlay').height = h;

    if (logo && turtle) {
      turtle.resize(w, h);
      //logo.run('cs');
    }
  }
}());




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

  var canvas_element = $("#sandbox"), canvas_ctx = canvas_element.getContext('2d'),
    turtle_element = $("#turtle"), turtle_ctx = turtle_element.getContext('2d');
  turtle = new CanvasTurtle(
    canvas_ctx,
    turtle_ctx,
    canvas_element.width, canvas_element.height, $('#overlay'));

  logo = new LogoInterpreter(
    turtle, stream,
    function (name, def) {      
    });
  logo.run('cs');

  initInput();

});
