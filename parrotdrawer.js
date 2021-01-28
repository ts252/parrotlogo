"use strict"

let sandbox_ctx, turtle_ctx, engine;

let domwidth, domheight

onmessage = function (e) {

    if (e.data.sandbox) {
        sandbox_ctx = e.data.sandbox.getContext("2d")
        turtle_ctx = e.data.turtle.getContext("2d")
    }

    if(!engine){
        engine = new Worker("parrotengine.js");
        engine.onmessage = (msg) => {
            if(msg.data.target == "sandbox"){
                sandbox_ctx.drawImage(msg.data.bitmap, 0, 0);
            }

            if(msg.data == "done"){
                postMessage("done")
            }
        }
    }

    if(e.data.w){
        domwidth = e.data.w
        domheight = e.data.h
    }

    if (e.data == "terminate") {
        if (engine) {
            engine.terminate()
            engine = null
        }
    } else {
        engine.postMessage({ w: domwidth, h: domheight, code: e.data.code });   
    }
}
