"use strict"

let sandbox_ctx, turtle_ctx, engine;

let domwidth, domheight

let turtle = {
    x: 0, y: 0, theta: 0, visible: true
}

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
          turtle_ctx.translate(turtle.x, -turtle.y);
          turtle_ctx.rotate(Math.PI/2 - turtle.theta);
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
        
    }

    if(!engine){
        engine = new Worker("parrotengine.js");
        engine.onmessage = (msg) => {
            if(msg.data.target == "sandbox"){
                sandbox_ctx.drawImage(msg.data.bitmap, 0, 0);
                drawTurtle(true);
            } else if(msg.data.target == "turtle"){
                turtle.x = msg.data.x
                turtle.y = msg.data.y
                turtle.theta = msg.data.theta
                turtle.visible = msg.data.turtleVisible
                drawTurtle();
            } else if(msg.data == "done"){   
                drawTurtle(true);             
                postMessage("done")
            }
        }
    }    

    if (e.data.cmd == "terminate") {
        if (engine) {
            engine.terminate()
            engine = null
        }
    } else if (e.data.cmd == "run"){
        engine.postMessage({ w: domwidth, h: domheight, code: e.data.code, turbo: e.data.turbo });   
    }
}
