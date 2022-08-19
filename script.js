const globals = new (function () {
    this.canvas = document.getElementById("myCanvas")
    this.ctx = document.getElementById("myCanvas").getContext("2d")

    // for now support only square grids
    this.sizeX = 500
    this.sizeY = 500
    this.gridX = 20
    this.gridY = 20
    this.pointsX = this.gridX + 1
    this.pointsY = this.gridY + 1

    // all point position, velocity, accel states
    this.points = []

    // adjacency lists of points
    this.stretchSprings = new Array(this.points.length)
    this.shearSprings = new Array(this.points.length)

    this.forces = new Map()
    this.rigidPoints = new Set()

    // physical properties
    this.mass = 100
    this.stretchStiffness = 5
    this.shearStiffness = 1
    this.dampingConst = 3

    this.shearSpringRestLen = (this.sizeX / this.gridX) * Math.sqrt(2) // square plz
    this.stretchSpringRestLen = this.sizeX / this.gridX
    this.pointMass = this.mass / (this.pointsX * this.pointsY)

    // visualization
    this.showStretchSprings = true
    this.showShearSprings = true
    this.showForces = true
    this.showRigidpoints = true
})()

function addPoint(x, y) {
    globals.points.push({ x, y, vx: 0, vy: 0 })
    return globals.points.length - 1
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2))
}

function sub(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y }
}

function normalize(p) {
    let length = Math.sqrt(Math.pow((p.x), 2) + Math.pow((p.y), 2))
    return { x: p.x / length, y: p.y / length }
}

function mulScalar(p, scalar) {
    return { x: p.x * scalar, y: p.y * scalar }
}

function pointLinearIndex(row, col) {
    if (row >= 0 && row < globals.pointsX && col >= 0 && col < globals.pointsY)
        return row * globals.pointsX + col
    return null
}

function addStretchSpring(p1, p2) {
    let stretchSprings = globals.stretchSprings
    if (!stretchSprings[p1])
        stretchSprings[p1] = []
    if (!stretchSprings[p2])
        stretchSprings[p2] = []
    stretchSprings[p1].push(p2)
    stretchSprings[p2].push(p1)
}

function addShearSpring(p1, p2) {
    let shearSprings = globals.shearSprings
    if (!shearSprings[p1])
        shearSprings[p1] = []
    if (!shearSprings[p2])
        shearSprings[p2] = []
    shearSprings[p1].push(p2)
    shearSprings[p2].push(p1)
}

function addForce(p, fx, fy) {
    globals.forces.set(p, { fx, fy })
}

function addRigidPoint(p) {
    globals.rigidPoints.add(p)
}

function triangulate() {
    let canvas = globals.canvas
    let sizeX = globals.sizeX
    let sizeY = globals.sizeY
    let stepX = sizeX / globals.gridX
    let stepY = sizeY / globals.gridY
    let topLeft = [(canvas.width / 2) - (sizeX / 2), (canvas.height / 2) - (sizeY / 2)]

    for (let j = 0; j <= sizeY; j += stepY) {
        for (let i = 0; i <= sizeX; i += stepX) {
            addPoint(topLeft[0] + i, topLeft[1] + j)
        }
    }

    let indices = [[0, 1], [1, 0]]
    for (let row = 0; row <= globals.gridY; row++) {
        for (let col = 0; col <= globals.gridX; col++) {
            let currIdx = pointLinearIndex(row, col)
            indices.forEach(e => {
                let otherIdx = pointLinearIndex(row + e[0], col + e[1])
                if (otherIdx !== null) {
                    addStretchSpring(currIdx, otherIdx)
                }
            })
        }
    }
    indices = [[-1, 1], [1, 1]]
    for (let row = 0; row <= globals.gridY; row++) {
        for (let col = 0; col <= globals.gridX; col++) {
            let currIdx = pointLinearIndex(row, col)
            indices.forEach(e => {
                let otherIdx = pointLinearIndex(row + e[0], col + e[1])
                if (otherIdx !== null) {
                    addShearSpring(currIdx, otherIdx)
                }
            })
        }
    }
}

// https://codepen.io/chanthy/pen/WxQoVG
function drawArrow(from, to) {
    //variables to be used when creating the arrow
    let headlen = 3
    let angle = Math.atan2(to.y - from.y, to.x - from.x)
    let ctx = globals.ctx

    ctx.save()

    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.lineWidth = 1
    ctx.stroke()

    //starting a new path from the head of the arrow to one of the sides of
    //the point
    ctx.beginPath()
    ctx.moveTo(to.x, to.y)
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
        to.y - headlen * Math.sin(angle - Math.PI / 7))

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 7),
        to.y - headlen * Math.sin(angle + Math.PI / 7))

    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(to.x, to.y)
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 7),
        to.y - headlen * Math.sin(angle - Math.PI / 7))

    //draws the paths created above
    ctx.stroke()
    ctx.restore()
}

function visualize() {
    let canvas = globals.canvas
    let ctx = globals.ctx
    let points = globals.points

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    if (globals.showStretchSprings) {
        ctx.strokeStyle = "#FF0000"
        ctx.beginPath()
        globals.stretchSprings.forEach((e, i) => {
            // we'll draw twice, but oh well
            e.forEach((p) => {
                ctx.moveTo(points[i].x, points[i].y)
                ctx.lineTo(points[p].x, points[p].y)
            })
        })
        ctx.stroke()
        ctx.closePath()
    }

    if (globals.showShearSprings) {
        ctx.strokeStyle = "#00FF00"
        ctx.beginPath()
        globals.shearSprings.forEach((e, i) => {
            // we'll draw twice, but oh well
            e.forEach((p) => {
                ctx.moveTo(points[i].x, points[i].y)
                ctx.lineTo(points[p].x, points[p].y)
            })
        })
        ctx.stroke()
        ctx.closePath()
    }

    if (globals.showForces) {
        ctx.strokeStyle = "#000000"
        globals.forces.forEach((value, key) => {
            let to = { x: points[key].x + (value.fx) / 10, y: points[key].y + (value.fy) / 10 }
            drawArrow(points[key], to)
        })
    }

    if (globals.showRigidpoints) {
        ctx.fillStyle = "#0000FF"
        globals.rigidPoints.forEach(e => {
            ctx.beginPath()
            ctx.arc(points[e].x, points[e].y, 5, 0, 2 * Math.PI)
            ctx.fill()
        })
    }
}

function simulate(delta) {
    let points = globals.points
    let rigidPoints = globals.rigidPoints
    let stretchSprings = globals.stretchSprings
    let shearSprings = globals.shearSprings
    let stretchSpringRestLen = globals.stretchSpringRestLen
    let stretchStiffness = globals.stretchStiffness
    let shearSpringRestLen = globals.shearSpringRestLen
    let shearStiffness = globals.shearStiffness
    let pointMass = globals.pointMass
    let forces = globals.forces
    let dampingConst = globals.dampingConst

    points.forEach((p, curr) => {

        if (rigidPoints.has(curr))
            return

        let fx = 0
        let fy = 0

        if (forces.has(curr)) {
            fx += forces.get(curr).fx
            fy += forces.get(curr).fy
        }

        stretchSprings[curr].forEach(other => {
            let length = distance(points[curr], points[other])
            let deltaLen = length - stretchSpringRestLen
            let force = stretchStiffness * deltaLen
            let direction = normalize(sub(points[other], points[curr]))
            let forceVector = mulScalar(direction, force)
            fx += forceVector.x
            fy += forceVector.y
        })
        shearSprings[curr].forEach(other => {
            let length = distance(points[curr], points[other])
            let deltaLen = length - shearSpringRestLen
            let force = shearStiffness * deltaLen
            let direction = normalize(sub(points[other], points[curr]))
            let forceVector = mulScalar(direction, force)
            fx += forceVector.x
            fy += forceVector.y
        })

        // Damping
        fx += -p.vx * dampingConst
        fy += -p.vy * dampingConst

        // Euler explicit scheme
        p.x += p.vx * delta
        p.y += p.vy * delta


        p.vx += (fx / pointMass) * delta
        p.vy += (fy / pointMass) * delta

    })
}

triangulate()

for(i = Math.floor(globals.pointsX / 2); i < globals.pointsX; i++) {
    addForce(pointLinearIndex(i, 0), -300, 0)
}

for (i = 0; i < globals.pointsX; i++) {
    addRigidPoint(i)
}

let lastTime = (new Date()).getTime()

function animation() {
    let currentTime = (new Date()).getTime()
    delta = (currentTime - lastTime) / 1000

    simulate(delta)
    visualize()

    lastTime = currentTime

    window.requestAnimationFrame(animation);
}

window.requestAnimationFrame(animation)

