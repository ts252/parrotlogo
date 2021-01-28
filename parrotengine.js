"use strict"
importScripts("./turtle.js")

let sandboxCanvas = new OffscreenCanvas(320, 240);
let turtleCanvas = new OffscreenCanvas(320, 240);
let turtle = new this.CanvasTurtle(
  sandboxCanvas.getContext("2d"),
  turtleCanvas.getContext("2d"),
  320, 240, null);    
let fps = 60, minfps = 1;

let lastFrame = 0

turtle.onstroke = () => {
  if(Date.now() > lastFrame + 1000/fps){
    lastFrame = Date.now()
    if(fps > minfps) {
      fps /= 1.1
    }
    let bmp = sandboxCanvas.transferToImageBitmap()
    postMessage({target: "sandbox", bitmap: bmp}, [bmp])
  }
}

onmessage = function (e) {
    if(e.data.w){
      sandboxCanvas.width = e.data.w
      sandboxCanvas.height = e.data.h
      turtle.resize(e.data.w, e.data.h)
    }
    fps = 60
    Function(e.data.code)(turtle)
    turtle.flush()    
    let bmp = sandboxCanvas.transferToImageBitmap()
    postMessage({target: "sandbox", bitmap: bmp}, [bmp])
    postMessage("done")
    console.debug("done")    
}