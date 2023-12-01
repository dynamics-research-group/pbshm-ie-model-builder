import * as THREE from 'three';

/* Print the current element selected onto the screen. */


let scene, camera;  // setup() must be run to configure these


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
            document.getElementById("info").innerHTML = this.pickedObject.name;
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

const canvas = document.querySelector( '#c');
const pickPosition = { x: 0, y: 0 };
const pickHelper = new PickHelper();

export {clearPickPosition, selectPickPosition, setup};