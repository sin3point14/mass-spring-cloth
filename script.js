const globals = {
    canvas : document.getElementById("myCanvas"),
    ctx : document.getElementById("myCanvas").getContext("2d"),
    sizeX : 500,
    sizeY : 500,
    gridX : 20,
    gridY : 20,
    mass : 1,
    points : [],
    // edges : [],
    // triangles : []
    stretchSprings : [],
    shearSprings : [],
    forces : [],
    // bendingSprings : [],
    showStretchSprings : true,
    showShearSprings : true,
    showForces : true,
    // showBendingSprings : false
}

globals.pointsX = globals.gridX + 1
globals.pointsY = globals.gridY + 1

function addPoint(x,y) {
    globals.points.push({x,y})
    return globals.points.length - 1
}

function pointLinearIndex(row, col) {
    if (row >= 0 && row < globals.pointsX && col >= 0 && col < globals.pointsY)
        return row * globals.pointsX + col
    return null
}

function addStretchSpring(p1,p2) {
    globals.stretchSprings.push({p1,p2})
}

function addShearSpring(p1,p2) {
    globals.shearSprings.push({p1,p2})
}

function addForce(p, fx, fy) {
    globals.forces.push({p, fx, fy})
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

    let indices = [[-1, 1], [1, 1]]
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

    indices = [[0, 1], [1, 0]]
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
function drawArrow(from, to){
    //variables to be used when creating the arrow
    let headlen = 3
    let angle = Math.atan2(to.y-from.y,to.x-from.x)
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
    ctx.lineTo(to.x-headlen*Math.cos(angle-Math.PI/7),
               to.y-headlen*Math.sin(angle-Math.PI/7))
 
    //path from the side point of the arrow, to the other side point
    ctx.lineTo(to.x-headlen*Math.cos(angle+Math.PI/7),
               to.y-headlen*Math.sin(angle+Math.PI/7))
 
    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(to.x, to.y)
    ctx.lineTo(to.x-headlen*Math.cos(angle-Math.PI/7),
               to.y-headlen*Math.sin(angle-Math.PI/7))
 
    //draws the paths created above
    ctx.stroke()
    ctx.restore()
}

function visualize() {
    let canvas = globals.canvas
    let ctx = globals.ctx
    let points = globals.points
    ctx.beginPath()
    ctx.rect((canvas.width / 2) - (globals.sizeX / 2), (canvas.height / 2) - (globals.sizeY / 2), globals.sizeX, globals.sizeY)
    ctx.stroke()
    ctx.closePath()
    if (globals.showStretchSprings) {
        ctx.strokeStyle = "#FF0000"
        ctx.beginPath()
        globals.stretchSprings.forEach(e => {
            ctx.moveTo(points[e.p1].x, points[e.p1].y)
            ctx.lineTo(points[e.p2].x, points[e.p2].y)
        })
        ctx.stroke()
        ctx.closePath()
    }

    if (globals.showShearSprings) {
        ctx.strokeStyle = "#00FF00"
        ctx.beginPath()
        globals.shearSprings.forEach(e => {
            ctx.moveTo(points[e.p1].x, points[e.p1].y)
            ctx.lineTo(points[e.p2].x, points[e.p2].y)
        })
        ctx.stroke()
        ctx.closePath()
    }

    if (globals.showForces) {
        ctx.strokeStyle = "#000000"
        globals.forces.forEach(e => {
            let to = {x: points[e.p].x + e.fx, y: points[e.p].y + e.fy}
            drawArrow(points[e.p], to)
        })
    }
}

triangulate()
addForce(pointLinearIndex(globals.pointsX - 1, 0), -10, 10)
visualize()

