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

    function CanvasTurtle(canvas_ctx, w, h) {
        this.canvas_ctx = canvas_ctx;
        this.width = Number(w);
        this.height = Number(h);

        this.x = this.py = 0;
        this.y = this.py = 0;
        this.r = Math.PI / 2;

        this.sx = this.sy = 1;

        this.color = '#000000';
        this.bgcolor = '#ffffff';
        this.penwidth = 1;
        this.penmode = 'paint';                
        this.visible = true;
        this.pendown = true;

        this.pathSteps = 0;

        this.was_oob = false;
        this.filling = 0;

        this._init();

    }

    Object.defineProperties(CanvasTurtle.prototype, {

        // Internal methods

        _init: {
            value: function () {
                this.canvas_ctx.lineCap = 'round';

                // Restore canvas state controlled by properties:
                this.color = this.color;
                this.penmode = this.penmode;
                this.penwidth = this.penwidth;

                this.canvas_ctx.setTransform(this.sx, 0, 0, -this.sy, this.width / 2, this.height / 2);
            }
        },

        _moveto: {
            value: function (x, y) {

                if (this.pathSteps == 10000) {
                   this.flush()
                }

                if (!this.pathSteps) {
                    this.canvas_ctx.beginPath();
                    this.canvas_ctx.moveTo(this.x, this.y)
                    this.pathSteps = 0;
                }

                this.pathSteps++;
                if (this.pendown) {
                    this.canvas_ctx.lineTo(x, y)
                } else {
                    this.canvas_ctx.moveTo(x, y)
                }
                this.x = this.px = x;
                this.y = this.py = y;

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
            value: function (distance) {
                var x, y, point, saved_x, saved_y, EPSILON = 1e-3;

                point = Math.abs(distance) < EPSILON;

                if (point) {
                    saved_x = this.x;
                    saved_y = this.y;
                    distance = EPSILON;
                }

                x = this.x + distance * Math.cos(this.r);
                y = this.y + distance * Math.sin(this.r);
                this._moveto(x, y);

                if (point) {
                    this.x = this.px = saved_x;
                    this.y = this.px = saved_y;
                }
            }
        },

        turn: {
            value: function (angle) {
                this.r -= deg2rad(angle);
            }
        },

        towards: {
            value: function (x, y) {
                return 90 - rad2deg(Math.atan2(x - this.x, y - this.y));
            }
        },

        clearscreen: {
            value: function () {
                this.home();
                this.clear();
            }
        },

        flush: {
            value: function () {
                if (this.pathSteps) {
                    this.canvas_ctx.stroke()                    
                    if(this.onstroke){
                        this.onstroke();                    
                    }
                    this.pathSteps = 0
                }
            }
        },

        clear: {
            value: function () {
                this.flush()
                this.canvas_ctx.save();
                try {
                    this.canvas_ctx.setTransform(1, 0, 0, 1, 0, 0);
                    this.canvas_ctx.clearRect(0, 0, this.width, this.height);
                    this.canvas_ctx.fillStyle = this.bgcolor;
                    this.canvas_ctx.fillRect(0, 0, this.width, this.height);
                } finally {
                    this.canvas_ctx.restore();
                }
            }
        },

        home: {
            value: function () {
                this._moveto(0, 0);
                this.r = deg2rad(90);
            }
        },

        // Properties
        pendown: {
            set: function (down) { this._down = down; },
            get: function () { return this._down; }
        },

        penmode: {
            get: function () { return this._penmode; },
            set: function (penmode) {
                this._penmode = penmode;
                this.canvas_ctx.globalCompositeOperation =
                    (this.penmode === 'erase') ? 'destination-out' :
                        (this.penmode === 'reverse') ? 'difference' : 'source-over';
                if (penmode === 'paint')
                    this.canvas_ctx.strokeStyle = this.canvas_ctx.fillStyle = this.color;
                else
                    this.canvas_ctx.strokeStyle = this.canvas_ctx.fillStyle = '#ffffff';
            }
        },

        turtlemode: {
            set: function (turtlemode) { this._turtlemode = turtlemode; },
            get: function () { return this._turtlemode; }
        },

        color: {
            get: function () { return this._color; },
            set: function (color) {
                if (this.pathSteps) {
                    this.canvas_ctx.stroke();
                    this.onstroke();
                    this.pathSteps = 0;
                }
                this._color = color;
                this.canvas_ctx.strokeStyle = this._color;
                this.canvas_ctx.fillStyle = this._color;
            }
        },

        bgcolor: {
            get: function () { return this._bgcolor; },
            set: function (color) {
                this._bgcolor = color;
                this.clear();
            }
        },

        penwidth: {
            set: function (width) {
                if (this.pathSteps) {
                    this.canvas_ctx.stroke();
                    this.pathSteps = 0;
                }
                this._penwidth = width;
                this.canvas_ctx.lineWidth = this._penwidth;
            },
            get: function () { return this._penwidth; }
        },
        
        position: {
            set: function (coords) {
                var x = coords[0], y = coords[1];
                x = (x === undefined) ? this.x : x;
                y = (y === undefined) ? this.y : y;
                this._moveto(x, y, /*setpos*/true);
            },
            get: function () {
                return [this.x, this.y];
            }
        },

        heading: {
            get: function () {
                return 90 - rad2deg(this.r);
            },
            set: function (angle) {
                this.r = deg2rad(90 - angle);
            }
        },

        visible: {
            set: function (visible) { this._visible = visible; },
            get: function () { return this._visible; }
        },

        scrunch: {
            set: function (sc) {
                var sx = sc[0], sy = sc[1];
                this.x = this.px = this.x / sx * this.sx;
                this.y = this.py = this.y / sy * this.sy;

                this.sx = sx;
                this.sy = sy;

                this.canvas_ctx.setTransform(this.sx, 0, 0, -this.sy, this.width / 2, this.height / 2);
            },
            get: function () {
                return [this.sx, this.sy];
            }
        },

    });

    global.CanvasTurtle = CanvasTurtle;
}(self));
