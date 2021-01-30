const parrotlogo = (() => {

    let mode = {
        turbo: false
    }

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
                    throw { message: `Unknown procedure "${n.name}"` }
                }
                if (state.procs[n.name].arity != n.params.length) {
                    throw { message: `"${n.name}" takes ${state.procs[n.name].arity} parameters, but ${n.params.length} were supplied` }
                }
            } else {
                for (let ch of (n.children || []).concat(n.ifchildren || [], n.elsechildren || [])) {
                    checkcall(ch)
                }
            }
        }

        let procs = parsetree.filter(x => x.type == "fndecl")
        let commands = parsetree.filter(x => !["comment", "ws", "fndecl"].includes(x.type))

        for (let n of parsetree) {
            checkcall(n)
        }

        if (commands.length == 0) {
            if(procs.length == 0){
                throw { message: "Code contains no instructions" }
            } else {
                throw { message: "Code has only procedure definitions" }
            }
        }        

        return procs.concat(commands)
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
            let async = mode.turbo ? "" : "async"
            let rv = `procs["${proc.name}"] = ${async} (${proc.params.map(x => "__" + x).join(", ")}) => {`
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
            if ("param" in call) {
                return mode.turtleops[call.fn](gen.any(call.param, state)) + "\n"
            } else {
                return mode.turtleops[call.fn]() + "\n"
            }
        },

        usercall: (call, state) => {
            let await = mode.turbo ? "" : "await "
            return `${await} procs["${call.name}"](${call.params.map(x => gen.any(x, state)).join(", ")});\n`
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


    const turtleops_turbo = {
        fd: (v) => `turtle.move(${v}); `,
        bk: (v) => `turtle.move(-(${v})); `,
        lt: (v) => `turtle.turn(-(${v})); `,
        rt: (v) => `turtle.turn(${v}); `,
        home: (v) => "turtle.home(); ",
        pd: () => "turtle.pendown=true; ",
        pu: () => "turtle.pendown=false; ",
        st: () => "turtle.visible=true; ",
        ht: () => "turtle.visible=false; ",
        clean: () => "turtle.clear(); ",
        setpc: (color) => `turtle.color = ${parseColor(color)};`,
        setpensize: (a) => `turtle.penwidth = (${a}); `,
        wait: (a) => ""
    }
    const turtleops_anim = {
        fd: (v) => `await turtle.move(${v}); `,
        bk: (v) => `await turtle.move(-(${v})); `,
        lt: (v) => `await turtle.turn(-(${v})); `,
        rt: (v) => `await turtle.turn(${v}); `,
        home: (v) => "await turtle.home(); ",
        pd: () => "await turtle.pendown(); ",
        pu: () => "await turtle.penup() ",
        st: () => "await turtle.show() ",
        ht: () => "await turtle.hide() ",
        clean: () => "await turtle.clear(); ",
        setpc: (color) => `await turtle.color(${parseColor(color)});`,
        setpensize: (a) => `await turtle.penwidth(${a}); `,
        wait: (a) => `await turtle.wait(${a}); `
    }

    let worker

    function codegen(src, turbo) {
        mode.turbo = turbo
        mode.turtleops = turbo ? turtleops_turbo : turtleops_anim

        return new Promise((res, rej) => {
            src += "\n\n"
            console.debug(src)

            try {
                let parsetree = pegparser.parse(src)

                let state = {
                    procs: {}
                }

                parsetree = hoist(parsetree, state)

                let output = `"use strict"; \nlet procs={}; `
                for (let n of parsetree) {
                    output += gen.any(n, state)
                }
                

                console.debug(output)

                if (!worker) {

                    worker = new Worker("parrotdrawer.js")

                    let offscreen_sandbox = $("#sandbox").transferControlToOffscreen();
                    let offscreen_turtle = $("#turtle").transferControlToOffscreen();

                    worker.postMessage({
                        cmd: "run",
                        code: output,
                        sandbox: offscreen_sandbox,
                        turtle: offscreen_turtle,
                        w: $("#sandbox").width,
                        h: $("#sandbox").height,                         
                        turbo: mode.turbo
                    },
                        [offscreen_sandbox, offscreen_turtle])
                } else {
                    worker.postMessage({
                        cmd: "run",
                        code: output, 
                        turbo: mode.turbo
                    })
                }

                worker.onmessage = (msg) => {
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
        run: (src, turbo) => {
            return codegen(src, turbo)
        },
        bye: () => {
            if (worker) {
                worker.postMessage({ cmd: "terminate" })
            }
        },
        resize: (w, h) => {
            if (worker) {
                worker.postMessage({ cmd: "resize", w: w, h: h })
            }
        }
    }
})()