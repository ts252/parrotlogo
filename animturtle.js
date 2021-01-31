//
// Turtle Graphics in Javascript
//

// Copyright (C) 2011 Joshua Bell
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

(function (global) {
    'use strict';

    function deg2rad(d) { return d / 180 * Math.PI; }
    function rad2deg(r) { return r * 180 / Math.PI; }

    function AnimTurtle(canvas_ctx, w, h) {
        this.canvas_ctx = canvas_ctx;
        this.width = Number(w);
        this.height = Number(h);

        this.x = this.py = 0;
        this.y = this.py = 0;
        this.r = Math.PI / 2;

        this.sx = this.sy = 1;

        this.color ('#000000');
        //this.bgcolor = '#ffffff';
        this.penwidth(1);
        this.penmode('paint');                
        this.show();
        this.pendown();

        this.filling = 0;

        this._init();

    }

    Object.defineProperties(AnimTurtle.prototype, {

        frame: {value: async function(distance){
            let t = this
            if(this.pxArrears + distance < this.pxPerSec / this.fps){
                this.pxArrears += distance
                return Promise.resolve()
            } else {
                this.pxArrears += distance - this.pxPerSec / this.fps
            
                await new Promise((res, rej) => {
                    requestAnimationFrame(() => {
                        this.fps = ++this.frames * 1000.0 / (Date.now() - this.started)
                        try{
                            t.onFrame()
                            res()
                        } catch(e){
                            rej(e)
                        }
                    })
                })
            }
        }},
    

        // Internal methods

        _init: {
            value: function () {
                this.canvas_ctx.lineCap = 'round';                
                this.color(this._color);
                this.penmode(this._penmode);
                this.penwidth(this.penwidth);

                this.pxArrears = 0;
                this.pxPerSec = 200;

                this.canvas_ctx.setTransform(this.sx, 0, 0, -this.sy, this.width / 2, this.height / 2);

                this.started = Date.now()
                this.fps = 60
                this.frames = 0
                this.animPxPerDeg = 0.3
            }
        },

        _moveto: {
            value: async function (x, y) {                
                let distance = Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2))
                let steps = Math.max(1, Math.round((distance + this.pxArrears) / (this.pxPerSec / this.fps)))

                const step = async (stepx, stepy, stepdistance) => {                    
                    if (this._down) {
                        this.canvas_ctx.beginPath();                
                        this.canvas_ctx.moveTo(this.x, this.y)
                        this.canvas_ctx.lineTo(stepx, stepy)
                        this.canvas_ctx.stroke()                
                    }
                    
                    this.x = stepx;
                    this.y = stepy;

                    await this.frame(stepdistance)
                }

                const startx = this.x,
                    starty = this.y
                
                for(let i = 0; i < steps; i++){
                    let distsofar = distance * (i + 1) / steps;
                    await step(startx + distsofar * Math.cos(this.r),
                        starty + distsofar * Math.sin(this.r),
                        distance / steps);
                }

                //prevent rounding errors
                this.x = x
                this.y = y

            }
        },

        // API methods
        resize: {
            value: function (w, h) {
                let img = this.canvas_ctx.getImageData(0, 0, this.width, this.height);
                let oldw = this.width, oldh = this.height
                this.width = w;
                this.height = h;
                //$('#sandbox').width = w; $('#sandbox').height = h;
                //$('#turtle').width = w; $('#turtle').height = h;
                this._init();
                this.canvas_ctx.putImageData(img, (w - oldw) / 2, (h - oldh) / 2);
            }
        },

        move: {
            value: async function (distance) {
                var x, y, point, saved_x, saved_y, EPSILON = 1e-3;

                point = Math.abs(distance) < EPSILON;

                if (point) {
                    saved_x = this.x;
                    saved_y = this.y;
                    distance = EPSILON;
                }

                x = this.x + distance * Math.cos(this.r);
                y = this.y + distance * Math.sin(this.r);
                await this._moveto(x, y, distance);

                if (point) {
                    this.x = saved_x;
                    this.y = saved_y;
                }

                this.onFrame()
            }
        },

        turn: {
            value: async function (angle) {
                let distanceEquiv = angle * this.animPxPerDeg
                let steps = Math.max(1, Math.round((distanceEquiv + this.pxArrears) / (this.pxPerSec / this.fps)))
                let finalAngle = this.r - deg2rad(angle)
                for(let i = 0; i < steps; i++){
                    this.r -= deg2rad(angle/steps);
                    await this.frame(distanceEquiv / steps)
                }
                this.r = finalAngle;
            }
        },

        towards: {
            value: function (x, y) {                
                return 90 - rad2deg(Math.atan2(x - this.x, y - this.y));
            }
        },

        clearscreen: {
            value: async function () {
                await this.home();
                await this.clear();
            }
        },      

        clear: {
            value: async function () {                
                this.canvas_ctx.save();
                try {
                    this.canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
                    this.canvas_ctx.clearRect(0, 0, this.width, this.height);
                    this.canvas_ctx.fillStyle = "white";
                    this.canvas_ctx.fillRect(0, 0, this.width, this.height);
                } finally {
                    this.canvas_ctx.restore();
                }
            }
        },

        home: {
            value: async function () {
                this.r = deg2rad(this.towards(0, 0));
                await this._moveto(0, 0);
                this.r = deg2rad(90);
            }
        },

        pendown: { value: async function() {
            this._down = true
        }},

        penup: { value: async function() {
            this._down = false
        }},

        show: { value: async function() {
            this.visible = true
        }},
        
        hide: { value: async function() {
            this.visible = false
        }},

        penmode: { value: async function(penmode) {
            this._penmode = penmode;
                this.canvas_ctx.globalCompositeOperation =
                    (this.penmode === 'erase') ? 'destination-out' :
                        (this.penmode === 'reverse') ? 'difference' : 'source-over';
                if (penmode === 'paint')
                    this.canvas_ctx.strokeStyle = this.canvas_ctx.fillStyle = this.color;
                else
                    this.canvas_ctx.strokeStyle = this.canvas_ctx.fillStyle = '#ffffff';
        }},

        color: { value: async function (color) {               
            this._color = color;
            this.canvas_ctx.strokeStyle = this._color;
            this.canvas_ctx.fillStyle = this._color;
        }},

        penwidth: { value: async function (width) {            
            this._penwidth = width;
            this.canvas_ctx.lineWidth = this._penwidth;
        }},
                
        scrunch: {
            set: function (sc) {
                var sx = sc[0], sy = sc[1];
                this.x = this.x / sx * this.sx;
                this.y = this.y / sy * this.sy;

                this.sx = sx;
                this.sy = sy;

                this.canvas_ctx.setTransform(this.sx, 0, 0, -this.sy, this.width / 2, this.height / 2);
            },
            get: function () {
                return [this.sx, this.sy];
            }
        },

    });

    global.AnimTurtle = AnimTurtle;
}(self));
