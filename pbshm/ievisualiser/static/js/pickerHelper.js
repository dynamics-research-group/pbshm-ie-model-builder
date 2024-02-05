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


/*** Print information on the selected element ***/

function addTabs(level){
    let text = '';
    for (let i=0; i<level; i++){
        text += '&emsp;'
    }
    return text;
}


function getsubinfo(subElement, level=1){
    let info = '';
    const keys = Object.keys(subElement);
    if (keys[0] != "0"){  // there are subsubelements to process
        for  (const key of keys){
            if (typeof(subElement[key]) == "number"){
                if (key != "type" && key != "name") {
                    info += addTabs(level);
                    info += '<span class="card-subtitle card-subtitle' + level + ' text-muted">' + key + ': </span></br>';
                }
                info += addTabs(level+1);
                info += '<span class="card-text1">' + JSON.stringify(subElement[key]) + '</span>';
            }
            else if (Array.isArray(subElement[key])) {
                for (const subsub of subElement[key]) {
                    info += getsubinfo(subsub, level+1) + '</br>';
                }
            }
            else {
                info += addTabs(level);
                info += '<span class="card-subtitle card-subtitle' + level + ' text-muted">' + key + ': </span></br>';
                info += getsubinfo(subElement[key], level+1)
            }
        }
    }
    else {
        info += addTabs(level);
        info += '<span class="card-text1">' + subElement + '</span>';
    }
    return info + "</br>";
}


function getIEInfo(element){
    // List the properties to force them to be printed in the desired order
    let info = '';
    try {
        const keys = Object.keys(element.full_info);
        const properties = ["name", "description", "type", "coordinates", "contextual", "geometry", "material"];
        for (const subInfo of properties){
            if (keys.includes(subInfo)) {
                info += '<div style="width: 18rem;">';
                info += '<h3 class="card-title">' + subInfo + ': </h3>' + getsubinfo(element.full_info[subInfo]);
                info +=  '</div>';
            }
        }
    } catch (TypeError) {
        ;  // User has not clicked on an element
    }
    info = info.replaceAll(/(<\/br>){1}(&emsp;){2,}<span class="card-text1">/g, ' <span class="card-text1">');
    while (info.includes("</br></br></br>")){
        info = info.replaceAll("</br></br></br>", "</br></br>")
    }
    return info;
}


const canvas = document.querySelector( '#c');
const pickPosition = { x: 0, y: 0 };
const pickHelper = new PickHelper();

export {clearPickPosition, selectPickPosition, setup};