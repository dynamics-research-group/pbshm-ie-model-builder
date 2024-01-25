import * as THREE from 'three';
import {glToJson} from './translationHelper.js';

/* Print the current element selected onto the screen. */


let scene, camera;  // setup() must be run to configure these
const scaleFactor = 100;


class PickHelper {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.pickedObject = null;
        this.pickedObjectSavedColor = 0;
    }

    pick(normalizedPosition, scene, camera) {
        // cast a ray through the frustum
        this.raycaster.setFromCamera( normalizedPosition, camera);
        // get the list of objects the ray intersected
        const intersectedObjects = this.raycaster.intersectObjects( scene.children);
        if ( intersectedObjects.length) {
            // pick the first object. It's the closest one
            this.pickedObject = intersectedObjects[ 0 ].object;
            let info = getIEInfo(this.pickedObject);
            document.getElementById("info").innerHTML = info;
        }
        else{
            document.getElementById("info").innerHTML = "";
        }
    }
}


function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ( event.clientX - rect.left) * canvas.width / rect.width,
        y: ( event.clientY - rect.top) * canvas.height / rect.height,
    };
}


function selectPickPosition(event) {
    const pos = getCanvasRelativePosition( event);
    pickPosition.x = ( pos.x / canvas.width) * 2 - 1;
    pickPosition.y = ( pos.y / canvas.height) * - 2 + 1; // note we flip Y
    pickHelper.pick(pickPosition, scene, camera)
}


function clearPickPosition() {
    document.getElementById("info").innerHTML = "";
}


function setup(usedScene, usedCamera){
    scene = usedScene;
    camera = usedCamera;
}


function getIEInfo(element){
    if (element.name == "floor"){
        return '';
    }
    let info = "<b>Name:</b> " + element.name + "</br>";
    info += "<b>Translation: </b>";
    info += "x: " + Math.round(glToJson(element, "x", element.position.x) * scaleFactor, 2) + "&emsp;";
    info += "y: " + Math.round(glToJson(element, "y", element.position.y) * scaleFactor, 2) + "&emsp;";
    info += "z: " + Math.round(glToJson(element, "z", element.position.z) * scaleFactor, 2) + "</br>";
    info += "<b>Rotation: </b>";
    info += "x: " + element.rotation._x + "&emsp;";
    info += "y: " + element.rotation._y + "&emsp;";
    info += "z: " + element.rotation._z + "</br>";
    info += "<b>Material type: </b>" + element.ie_material + "</br>";
    info += "<b>Contextual type: </b>" + element.ie_type + "</br>";
    info += "<b>Dimensions: </b>" + element.dimens_info;
    return info;
}

const canvas = document.querySelector( '#c');
const pickPosition = { x: 0, y: 0 };
const pickHelper = new PickHelper();

export {clearPickPosition, selectPickPosition, setup};