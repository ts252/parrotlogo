let drawbuf = []
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

function draw(op) {
    drawbuf.push(op)
    if (drawbuf.length > 10000) {
        console.debug(`flushing ${drawbuf.length} draw ops`)
        postMessage(drawbuf)
        drawbuf = []
    }
}

const parrotlogo = {
    fd: (v) => { turtle.move(v) },
    bk: (v) => { turtle.move(-v) },
    lt: (v) => { turtle.turn(-v) },
    rt: (v) => { turtle.turn(v) },
    home: (v) => { turtle.home(v) },
    pd: () => { turtle.pendown = true },
    pu: () => { turtle.pendown = false },
    st: () => { turtle.visible = true },
    ht: () => { turtle.visible = false },
    clean: () => { turtle.clear() },
    setpc: (color) => {
        turtle.color = parseColor(color)
    },
    setpensize: (a) => {
        turtle.penwidth = a
    },
    wait: (a) => {

    }
}


onmessage = function (e) {
    let procs = {}
    eval(e.data.code)
    postMessage(drawbuf)
    drawbuf = []
    postMessage("done")
    console.debug("done")
    close()
}