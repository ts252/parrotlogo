"use strict"
importScripts("./turtle.js")

let sandboxCanvas = new OffscreenCanvas(320, 240);
let turtleCanvas = new OffscreenCanvas(320, 240);
let turtle = new this.CanvasTurtle(
    sandboxCanvas.getContext("2d"),
    320, 240, null);
let fps = 30, minfps = 1;

let lastFrame = 0, lastTurtle = 0

turtle.onstroke = () => {
    if (Date.now() > lastFrame + 1000 / fps) {
        lastFrame = Date.now()
        if (fps > minfps) {
            fps /= 1.1
        }
        let bmp = sandboxCanvas.transferToImageBitmap()
        postMessage({ target: "sandbox", bitmap: bmp }, [bmp])
    }

    if (Date.now() > lastTurtle + 1000 / 30) {
        lastTurtle = Date.now()
        postMessage({ target: "turtle", x: turtle.x, y: turtle.y, theta: turtle.r, turtleVisible: turtle.visible })
    }
}

onmessage = function (e) {
    if (e.data.w) {
        sandboxCanvas.width = e.data.w
        sandboxCanvas.height = e.data.h
        turtle.resize(e.data.w, e.data.h)
    }
    
    fps = 60
    Function(e.data.code)()
    turtle.flush()
    let bmp = sandboxCanvas.transferToImageBitmap()
    postMessage({ target: "sandbox", bitmap: bmp }, [bmp])
    postMessage({ target: "turtle", x: turtle.x, y: turtle.y, theta: turtle.r, turtleVisible: turtle.visible })
    postMessage("done")

}