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

  function run(code) {

    var error = $('#display #error');
    error.classList.remove('shown');

    var v = code || input.getValue();
    if (v === '') {
      return;
    }
    //commandHistory.push(v);

    
    document.body.classList.add('running');
    parrotlogo.run(v).catch(function (e) {
      error.innerHTML = '';
      error.appendChild(document.createTextNode(e.message));
      error.classList.add('shown');
    }).then(function () {
      document.body.classList.remove('running');
    });    
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

  parrotlogo.resize(w, h);
}

window.addEventListener('resize', resize);

window.addEventListener('DOMContentLoaded', function () {
  initInput();
});