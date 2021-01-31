"use strict"
importScripts("./animturtle.js")

let sandbox_ctx, turtle_ctx, engine;

let domwidth, domheight

let turtleSprite = {
    x: 0, y: 0, r: Math.PI / 2, visible: true
}

const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

let turtle;

let runningTurbo, interrupted = false;

function drawTurtle (clear){
    if(turtle_ctx){    
        function invert(p) { return [-p[0], p[1]]; }  
  
        if(clear){
            turtle_ctx.save();
            turtle_ctx.setTransform(1, 0, 0, 1, 0, 0);
            turtle_ctx.clearRect(0, 0, domwidth, domheight);
            turtle_ctx.restore();
        }
  
        if (turtle.visible) {
          
          turtle_ctx.save();
          turtle_ctx.translate(turtleSprite.x, -turtleSprite.y);
          turtle_ctx.rotate(Math.PI/2 - turtleSprite.r);
          turtle_ctx.beginPath();          
  
          var points = [
            [0,-10],[5, 0],[0,0]
          ]
  
          points.concat(points.slice(1, -1).reverse().map(invert))
            .forEach(function(pair, index) {
              turtle_ctx[index ? 'lineTo' : 'moveTo'](pair[0], pair[1]);
            });
  
          turtle_ctx.closePath();
          turtle_ctx.stroke();        
  
          turtle_ctx.restore();
        }
      }   
}

onmessage = function (e) {

    if(e.data.w){
        domwidth = e.data.w
        domheight = e.data.h
    }

    if (e.data.sandbox) {
        sandbox_ctx = e.data.sandbox.getContext("2d")
        turtle_ctx = e.data.turtle.getContext("2d")

        turtle_ctx.lineCap = 'round';
        turtle_ctx.strokeStyle = 'red';
        turtle_ctx.lineWidth = 2;
        turtle_ctx.setTransform(1, 0, 0, 1, domwidth / 2, domheight / 2);

        turtle = new this.AnimTurtle(sandbox_ctx, domwidth, domheight);
        turtle.onFrame = () => {
            for(let prop in turtleSprite){
                turtleSprite[prop] = turtle[prop]
            }
            drawTurtle(true)
            if(interrupted){
                interrupted = false;
                throw {message: "interrupted"}
            }
        }
        
    }

    if(!engine){
        engine = new Worker("parrotengine.js");
        engine.onmessage = (msg) => {
            if(msg.data.target == "sandbox"){
                sandbox_ctx.drawImage(msg.data.bitmap, 0, 0);
                drawTurtle(true);
            } else if(msg.data.target == "turtle"){
                for(let prop in turtleSprite){
                    turtleSprite[prop] = msg.data[prop]
                }
                drawTurtle();
            } else if(msg.data == "done"){   
                drawTurtle(true);             
                postMessage("done")
            }
        }
    }    

    if (e.data.cmd == "terminate") {
        if (runningTurbo && engine) {
            engine.terminate()
            engine = null
        } else {
            interrupted = true;
        }
    } else if (e.data.cmd == "run"){
        if(e.data.turbo){
            sandbox_ctx.setTransform(1, 0, 0, 1, 0, 0);
            engine.postMessage({ w: domwidth, h: domheight, code: e.data.code, turbo: e.data.turbo });   
        } else {        
            turtle._init()
            for(let prop in turtleSprite){
                turtle[prop] = turtleSprite[prop]
            }
            let af = new AsyncFunction(e.data.code)
            af().then(() => {    
                turtle.onFrame()
                interrupted = false
                postMessage("done")
            })        
        }
    }
}
