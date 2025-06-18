import * as THREE from 'three';

/**
    When threejs stores a shape's (x,y,z) coordinates this refers to the centre of the shape.
    However, in json documents a shape's coordinates refer to its bottom, left, front corner.
    This file provides the functions to translate between the threejs and json representations.
 */

/**
 * Calculate the conversion amount of an x, y or z coordinate for the given object.
 * @param {THREE.Mesh} currentObject The threejs object
 * @param {char} dimension 'x', 'y' or 'z'
 * @returns float
 */
function conversionAmount(currentObject, dimension){
    // Must use setFromObject(currentObject) instead of currentObject.boundingBox
    // because the latter does not take into account rotation,
    // therefore giving the wrong min and max values when an object is rotated.
    let box = new THREE.Box3().setFromObject(currentObject);
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

/**
 * Convert a threejs coordinate of the object to its json coordinate.
 * @param {THREE.Mesh} currentObject The threejs object
 * @param {char} dimension  'x', 'y' or 'z'
 * @param {float} value Value of the x, y or z coordinate.
 * @returns 
 */
function glToJson(currentObject, dimension, value){
    if (dimension == "x" || dimension == "y"){
        return value - conversionAmount(currentObject, dimension);
    } else if (dimension == "z") {
        return -value - conversionAmount(currentObject, dimension);
    }
}

/**
 * Convert a json coordinate of the object to its threejs coordinate.
 * @param {THREE.Mesh} currentObject The threejs object
 * @param {char} dimension  'x', 'y' or 'z'
 * @param {float} value Value of the x, y or z coordinate.
 * @returns 
 */
function jsonToGl(currentObject, dimension, value){
    if (dimension == "x" || dimension == "y"){
        return value + conversionAmount(currentObject, dimension);
    } else if (dimension == "z") {
        return -value - conversionAmount(currentObject, dimension);
    }
}

export {glToJson, jsonToGl};