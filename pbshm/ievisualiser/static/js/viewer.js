import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

import * as gui from './guiHelper.js';
import { geometryDetails } from './geometryHelper.js';
import * as colours from './colourHelper.js';


let elements = [];  // list all IEs in the model so we can check which one the user clicked on

/**
 * Set the scene (adding camera, controls, lights and floor) and add the model elements.
 * @param {THREE.canvas} canvas 
 * @param {THREE.scene} scene 
 * @param {list} shapes Details of each element (provided by jsonHelper.extractShapes) (when loading a model)
 * @returns Dict with keys 'elements' (a list of THREE.Mesh objects), 'camera', 'controls', and 'floor'.
 * Note that the elements in the dict are pre-loaded into the scene.
 */
function plotElements(canvas, scene, shapes){
	// Find the boundaries of the model to figure out a suitable camera position and floor size/location.
	let minX = 0;
	let minZ = 0;
	let maxX = 0;
	let maxY = 0;
	let maxZ = 0;
	// Sometimes a model is too large to display without becoming distorted
	// so use scaleFactor to set the amount by which to divide the model to make it smaller.
	const scaleFactor = 1;
	for (let i=0; i<shapes.length; i++){
		const shape = geometryDetails(shapes[i], scaleFactor);
		shape.geometry.computeBoundingBox();
		maxX = Math.max(maxX, shape.position.x + shape.geometry.boundingBox.max.x);
		maxY = Math.max(maxY, shape.position.y + shape.geometry.boundingBox.max.y);
		maxZ = Math.max(maxZ, shape.position.z + shape.geometry.boundingBox.max.z);
		minX = Math.min(minX, shape.position.x - shape.geometry.boundingBox.min.x);
		minZ = Math.min(minZ, shape.position.z - shape.geometry.boundingBox.min.z);
		scene.add(shape);
		elements.push(shape);
		colours.cElements.push(shape);
	}

	// Set up the display
	const fov = 45;	// field of view - determines width of near and far planes
	const aspect = 2;	// the canvas default	(300 x 150)
	const near = 0.1;	// height of near plane
	const far = (maxX + maxY + maxZ) * 6;	// height of far plane
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.set(maxX/2, maxX*0.5, maxX*3);	// where the camera is located
	camera.up.set(0, 1, 0);
	
	// Give the user the ability to control the camera
	const controls = new OrbitControls(camera, canvas);
	controls.target.set((maxX-minX)/2, 0, -(maxZ-minZ));
	controls.update();

	// Add directional light to help highlight corners of the 3D shapes
	const color = 0xFFFFFF;
	const intensity = 3;
	const light = new THREE.DirectionalLight( color, intensity );
	light.position.set(0, 10, 10);
	light.target.position.set(-5, 5, -10 );
	scene.add(camera);
	camera.add( light );
	camera.add( light.target ); 

	// Add ambient light because otherwise the shadow from the directional light is too dark
	const intensity2 = 0.2;
	const light2 = new THREE.AmbientLight(color, intensity2);
	scene.add(light2);

	// Add ground	 
	const planeGeometry = new THREE.PlaneGeometry((maxX-minX), (maxZ-minZ)*2);
	planeGeometry.rotateX( - Math.PI / 2 );
	const floor = new THREE.Mesh( planeGeometry, new THREE.MeshBasicMaterial( { visible: true } ) );
	floor.position.set((maxX-minX)/2, 0, -(maxZ-minZ))
	floor.name = "plane";
	scene.add(floor);

	return {'elements': elements,
			'camera': camera,
			'controls': controls,
			'floor': floor};
}

/**
 * Create a threejs rendering of the model and add it to the html canvas labelled 'c'.
 * @param {list} shapes Details of each element (provided by jsonHelper.extractShapes) (when loading a model)
 */
function plotModel(shapes) {
	const canvas = document.querySelector('#c');
	const renderer = new THREE.WebGLRenderer({antialias: true, canvas});
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	const viewer = plotElements(canvas, scene, shapes);

	// GUI for changing the colour scheme
	colours.addColourFolders(gui.coloursFolder, render, "contextual");
	gui.setViewerMode();
	
	// Show the relevant colours used by the model
	for (let shape of viewer.elements) {
		if (shape.el_contextual != "ground") {
			colours.makeContextColourVisible(shape.el_contextual);
			colours.makeMaterialColourVisible(shape.el_material);
			colours.makeGeometryColourVisible(shape.el_geometry);
		}
	}
    
	document.addEventListener('pointerdown', selectElement);

	/**
	 * Show details of the seleted element (if any) in the gui.
	 * @param {event} event pointerDown event
	 */	
	function selectElement(event){
		let raycaster = new THREE.Raycaster();
		let pointer = new THREE.Vector2();
		pointer.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
		raycaster.setFromCamera( pointer, viewer.camera );
		const intersects = raycaster.intersectObjects( elements, false );
		if ( intersects.length > 0 ) {
			if (intersects[0].object.name != "plane") {
				const currentObject = intersects[0].object;
				gui.setGeometryFolder(currentObject);
			}
		}
	}

    /**
     * Check if the threejs elements need to be updated because the screen is resized (avoids distortion).
     * @param {THREE.render} renderer 
     * @returns boolean
     */
    function resizeRendererToDisplaySize( renderer ) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if ( needResize ) {
            renderer.setSize( width, height, false );
        }
        return needResize;
    }

	/**
     * Render the threejs elements.
     */
	function render() {
		if ( resizeRendererToDisplaySize( renderer ) ) {
			const canvas = renderer.domElement;
			viewer.camera.aspect = canvas.clientWidth / canvas.clientHeight;
			viewer.camera.updateProjectionMatrix();
		}
		renderer.render( scene, viewer.camera );
		requestAnimationFrame( render );
	}
	requestAnimationFrame(render);
}

export {plotElements, plotModel};