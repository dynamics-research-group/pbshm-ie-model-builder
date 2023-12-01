import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
    const geom = mergeGeometries([bottomGeom, middleGeom, topGeom]);
    geom.type = "BeamGeometry";
    geom.parameters = {"width":width, "h":h, "s":s, "t":t, "b":b};
    return geom;
}



export {generateBeam};