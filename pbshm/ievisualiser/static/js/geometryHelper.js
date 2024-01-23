import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { colours } from './globals.js';
import { TrapezoidGeometry } from './trapezoid.js';
import {ObliqueCylinderGeometry} from './obliqueCylinder.js'


const EL_NAME = 0	// for debugging
const EL_TYPE = 1;  // e.g. column, plate (determines geometry colour)
const SHAPE = 2;    // e.g. cuboid, sphere
const DIMENS = 3;   // e.g. length, width, radius
const COORDS = 4;   // (x,y,z) position of bottom left, front, corner of the shape
const ROTATE = 5;   // how much rotation is needed on each axis
const METHOD = 6;   // e.g. is it translate or translateAndScale
const FACES = 7;    // used by translateAndScale


function geometryDetails(element, scaleFactor=100){
    let geometry, x, y, z
    // Threejs automatically puts a shape's (x,y,z) coords in the centre.
    // We want the given coords to be in the bottom, left, front corner.
    // Therefore each coordinate must be translated to the desired location
    // (taking into account the scaleFactor).
    if (element[METHOD] == "translate" || element[METHOD] == "regular"){
        if (element[SHAPE] == "cuboid" || element[SHAPE] == "rectangular"){
            const width = element[DIMENS].length / scaleFactor;	// called length in json
            const depth = element[DIMENS].width / scaleFactor;
            const height = element[DIMENS].height / scaleFactor;
            x = (element[COORDS][0] / scaleFactor) + (width / 2);
            y = (element[COORDS][1] / scaleFactor) + (height / 2);
            z = (element[COORDS][2] / scaleFactor) + (depth / 2);
            geometry = new THREE.BoxGeometry(width, height, depth);
        }
        else if (element[SHAPE] == "sphere") {
            const radius = element[DIMENS].radius
            x = (element[COORDS][0] / scaleFactor) + (radius / 2);
            y = (element[COORDS][1] / scaleFactor) + (radius / 2);
            z = (element[COORDS][2] / scaleFactor) + (radius / 2);
            geometry = new THREE.SphereGeometry(radius, 12, 8);
        }
        else if (element[SHAPE] == "cylinder" || element[SHAPE] == "circular") {
            const radius = element[DIMENS].radius
            let length
            if ("length" in element[DIMENS]){
                length = element[DIMENS].length
            }
            else {
                length = element[DIMENS].thickness
            }
            x = (element[COORDS][0] / scaleFactor) + (radius / 2);
            y = (element[COORDS][1] / scaleFactor) + (length / 2);
            z = (element[COORDS][2] / scaleFactor) + (radius / 2);
            geometry = new THREE.CylinderGeometry(radius, radius, length, 12);
            geometry.rotateZ(Math.PI/2);  // rotate because cylinder is horizontal in json but vertical in webGL
        }
        else if (element[SHAPE] == "i-beam" || element[SHAPE] == "c-beam"){
            const width = element[DIMENS].length / scaleFactor;
            const h = element[DIMENS].h / scaleFactor;
            const s = element[DIMENS].s / scaleFactor;
            const t = element[DIMENS].t / scaleFactor;
            const b = element[DIMENS].b / scaleFactor;
            geometry = generateBeam(element[SHAPE], width=4, h=4, s=1, t=1, b=1)
        }
        else if (element[SHAPE] == "other"){
            console.log("Element", EL_NAME, "is shape other.");
        }
    }
    else if (element[METHOD] == "translateAndScale"){
        if (element[SHAPE] == "cuboid"){
            const leftTransY = element[FACES].left.translational.y.value / scaleFactor;
            const leftTransZ = element[FACES].left.translational.z.value / scaleFactor;
            const leftDimensY = element[FACES].left.dimensions.y.value / scaleFactor;
            const leftDimensZ = element[FACES].left.dimensions.z.value / scaleFactor;
            const rightTransY = element[FACES].right.translational.y.value / scaleFactor;
            const rightTransZ = element[FACES].right.translational.z.value / scaleFactor;
            const rightDimensY = element[FACES].right.dimensions.y.value / scaleFactor;
            const rightDimensZ = element[FACES].right.dimensions.z.value / scaleFactor;
            const width = element[DIMENS].length / scaleFactor;	// called length in json
            const height = Math.max(leftTransY+leftDimensY, rightTransY+rightDimensY);
            const depth = Math.max(leftTransZ+leftDimensZ, rightTransZ+rightDimensZ);
            x = (element[COORDS][0] / scaleFactor) + (width / 2);
            y = (element[COORDS][1] / scaleFactor) + (height / 2);
            z = (element[COORDS][2] / scaleFactor) + (depth / 2);
            geometry = new TrapezoidGeometry(leftTransY, leftTransZ,
                leftDimensY, leftDimensZ, rightTransY, rightTransZ,
                    rightDimensY, rightDimensZ, width);
        }
        else if (element[SHAPE] == "cylinder"){
            const width = element[DIMENS].length / scaleFactor;	// called length in json
            const leftTransY = element[FACES].left.translational.y.value / scaleFactor;
            const leftTransZ = element[FACES].left.translational.z.value / scaleFactor;
            const rightTransY = element[FACES].right.translational.y.value / scaleFactor;
            const rightTransZ = element[FACES].right.translational.z.value / scaleFactor;
            const leftRadius = element[FACES].left.dimensions.radius.value / scaleFactor;
            const rightRadius = element[FACES].left.dimensions.radius.value / scaleFactor;
            const skewY = rightTransY - leftTransY;
            const skewZ = -(rightTransZ - leftTransZ);  // z is in different direction in json to with webGL
            geometry = new ObliqueCylinderGeometry(rightRadius, leftRadius, width, skewY, skewZ);
            // Rotate because cylinder is assumed horizontal in json but automatically vertical in webGL
            geometry.rotateZ(Math.PI/2);
            x = (element[COORDS][0] / scaleFactor) + (radius / 2);
            y = (element[COORDS][1] / scaleFactor) + (length / 2);
            z = (element[COORDS][2] / scaleFactor) + (radius / 2);
        }
        else if (element[SHAPE] == "other"){
            console.log("Element", EL_NAME, "is shape other.");
        }
    }
    else {
        console.error("Unknown handling method", element[METHOD]);
    }
    const material = new THREE.MeshPhongMaterial({color: colours[element[EL_TYPE]]});
    const shape = new THREE.Mesh(geometry, material);
    shape.name = element[EL_NAME];
    shape.position.x = x;
    shape.position.y = y;
    shape.position.z = z;
    
    if (element[ROTATE] != undefined){
        if (element[ROTATE].alpha.unit == "radians"){
            shape.rotateX(element[ROTATE].alpha);    
        }
        else{
            shape.rotateX(element[ROTATE].alpha * (Math.PI/180));
        }

        if (element[ROTATE].beta.unit == "radians"){
            shape.rotateY(element[ROTATE].beta);    
        }
        else{
            shape.rotateY(element[ROTATE].beta * (Math.PI/180));
        }

        // Note the sign change as positive z in json is negative z in webgl
        if (element[ROTATE].gamma.unit == "radians"){
            shape.rotateZ(-element[ROTATE].gamma);    
        }
        else{
            shape.rotateZ(-element[ROTATE].gamma * (Math.PI/180));
        }
    }
    return shape;
}


/* i-beam labels:
    -> ---------------  <-
    t  |             |   |
    -> ------   ------   |
            |   |        |
            | s |        |h
            |   |        |
        ------   ------   |
        |             |   |
        ---------------  <-
                b
*/
function generateBeam(type, width=4, h=4, s=1, t=1, b=1){
    // Create three cuboids to represent the beam
    const bottomGeom = new THREE.BoxGeometry(width, t, b);
    const middleGeom = new THREE.BoxGeometry(width, h-(t*2), s);
    const topGeom = new THREE.BoxGeometry(width, t, b);

    // Translate the locations for each of the three parts of the i-beam
    // x and z locations are the same for each part (except c-beam)
    bottomGeom.translate(0, (t/2)-(h/2), 0);
    topGeom.translate(0, (h/2)-(t/2), 0);
    if (type == "c-beam"){
        middleGeom.translate(0, 0, - b + (s / 2));
    }
    const geometry = mergeGeometries([bottomGeom, middleGeom, topGeom]);
    geometry.type = "BeamGeometry";
    geometry.parameters = {"width":width, "h":h, "s":s, "t":t, "b":b};
    return geometry;
}


export {geometryDetails, generateBeam};