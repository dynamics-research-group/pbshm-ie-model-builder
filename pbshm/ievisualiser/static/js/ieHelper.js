import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { geometryDetails } from './geometryHelper.js';
import { addColourFolders, makeContextColourVisible, makeMaterialColourVisible, makeGeometryColourVisible, cElements } from './colourHelper.js';
import * as picker from './pickerHelper.js';


function plotElements(canvas, scene, shapes){
// Some shapes are too big to easily display, so find the range
	// of x, y and z values (for calculating FOV) and then scale them down.
	let elements = [];  // for accessing all IEs in the model
	// To know how big the floor needs to be
	let minX = 0;
	let minZ = 0;
	let maxX = 0;
	let maxY = 0;
	let maxZ = 0;
	const scaleFactor = 1;
	for (let i=0; i<shapes.length; i++){
		const shape = geometryDetails(shapes[i], scaleFactor);
		maxX = Math.max(maxX, shape.position.x);
		maxY = Math.max(maxY, shape.position.y);
		maxZ = Math.max(maxZ, shape.position.z);
		minX = Math.min(minX, shape.position.x);
		minZ = Math.min(minZ, shape.position.z);
		scene.add(shape);
		elements.push(shape);
		cElements.push(shape);
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
	controls.target.set(maxX/2, maxY*0.75, 0);	// where the camera looks
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
	const planeGeometry = new THREE.PlaneGeometry((maxX-minX)*2, (maxX-minX)*2);
	planeGeometry.rotateX( - Math.PI / 2 );
	const floor = new THREE.Mesh( planeGeometry, new THREE.MeshBasicMaterial( { visible: true } ) );
	floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
	floor.name = "plane";
	scene.add(floor);

	return {'elements': elements,
			'camera': camera,
			'controls': controls,
			'floor': floor};
}

function plotModel(shapes) {
	const canvas = document.querySelector('#c');
	const renderer = new THREE.WebGLRenderer({antialias: true, canvas});
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	const viewer = plotElements(canvas, scene, shapes);

	// GUI for changing the colour scheme
	const gui = new GUI();
	addColourFolders(gui, render, "contextual");
	
	// Show the relevant colours
	for (let shape of viewer.elements) {
		if (shape.el_contextual != "ground") {
			makeContextColourVisible(shape.el_contextual);
			makeMaterialColourVisible(shape.el_material);
			makeGeometryColourVisible(shape.el_geometry);
		}
	}
    
	// Print the name of the currently selected element
	picker.setup(scene, viewer.camera);
	picker.clearPickPosition();
    document.addEventListener('mousedown', picker.selectPickPosition, false);
    //window.addEventListener('mouseout', picker.clearPickPosition);
    //window.addEventListener('mouseleave', picker.clearPickPosition);

	

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