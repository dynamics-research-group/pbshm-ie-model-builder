import * as THREE from 'three';

function conversionAmount(currentObject, dimension){
    let box = new THREE.Box3().setFromObject(currentObject);
    currentObject.geometry.computeBoundingBox();
    let mid;
    switch (dimension) {
        case "x":
            mid = (box.min.x + box.max.x) / 2;
            return mid - box.min.x;
        case "y":
            mid = (box.min.y + box.max.y) / 2;
            return mid - box.min.y;
        case "z":
            mid = (box.min.z + box.max.z) / 2;
            return mid - box.min.z;
    }
}


function glToJson(currentObject, dimension, value){
    if (dimension == "x" || dimension == "y"){
        return value - conversionAmount(currentObject, dimension);
    } else if (dimension == "z") {
        return -value - conversionAmount(currentObject, dimension);
    }
}


function jsonToGl(currentObject, dimension, value){
    if (dimension == "x" || dimension == "y"){
        return value + conversionAmount(currentObject, dimension);
    } else if (dimension == "z") {
        return -value - conversionAmount(currentObject, dimension);
    }
}


export {glToJson, jsonToGl};