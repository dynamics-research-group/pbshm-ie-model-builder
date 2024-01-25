import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { geometryDetails } from './geometryHelper.js';
import * as picker from './pickerHelper.js';


function extractShapes(rawtext){
	const data = JSON.parse(rawtext);
	const elements = data.models.irreducibleElement.elements;
	let details = [];
	let rotation;
	let faces;
	for (var i=0; i<elements.length; i++){
		try {
				const element_type = elements[i].contextual.type;
				const element_name = elements[i].name;
				const element_material = elements[i].material.type.name + "-" + elements[i].material.type.type.name;
				let shape_name;
				let method = elements[i].geometry.type.type.name;
				if (method != "translate" && method != "translateAndScale"){
					// Shape is stored on a step higher in the tree for other elements
					method = "regular";
					shape_name = elements[i].geometry.type.type.name;
				} else {
					shape_name = elements[i].geometry.type.type.type.name;
				}
				let dimensions = {};
				for (let [key, value] of Object.entries(elements[i].geometry.dimensions)){
					dimensions[key] = value.value;
				}
				try {
					if ("rotational" in elements[i].coordinates.global){
						rotation = elements[i].coordinates.global.rotational;}}
				catch (TypeError) {;}  // no info given
				try {
					if ("faces" in elements[i].geometry){
						faces = elements[i].geometry.faces; }}
				catch (TypeError) {;}  // no info given
				const coords = [elements[i].coordinates.global.translational.x.value,
								elements[i].coordinates.global.translational.y.value,
								elements[i].coordinates.global.translational.z.value];
				details.push({"element_name": element_name,
								"element_type": element_type,  // e.g. column, plate (determines geometry colour)
								"element_material": element_material,  // e.g. metal, ceramic
								"shape": shape_name,  // e.g. cuboid, sphere
								"dimensions": dimensions,  // e.g. length, width, radius
								"coords": coords,  // (x,y,z) position of bottom left, front, corner of the "shape_name"
								"rotation": rotation,  // how much rotation is needed on each axis
								"method": method,  // e.g. is it translate or translateAndScale
								"faces": faces});  // used by translateAndScale
		}
		catch(err) {
				// Error typically occurs because there are no dimensions associated with the element.
				// Pass, and main.js will instead choose to create a network graph if no elements had any dimensions.
				;
		}
	}
  return details;
}



function plotIE(shapes) {
	const canvas = document.querySelector('#c');
	const renderer = new THREE.WebGLRenderer({antialias: true, canvas});
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	// Some shapes are too big to easily display, so find the range
	// of x, y and z values (for calculating FOV) and then scale them down.
	let minX = 0;
	let minZ = 0;
	let maxX = 0;
	let maxY = 0;
	let maxZ = 0;
	const scaleFactor = 100;
	for (var i=0; i<shapes.length; i++){
		const shape = geometryDetails(shapes[i], scaleFactor);
		maxX = Math.max(maxX, shape.position.x);
		maxY = Math.max(maxY, shape.position.y);
		maxZ = Math.max(maxZ, shape.position.z);
		minX = Math.min(minX, shape.position.x);
		minZ = Math.min(minZ, shape.position.z);
		scene.add(shape);
	}

	// Set up the display
	const fov = maxY;	// field of view - determines width of near and far planes
	const aspect = 2;	// the canvas default	(300 x 150)
	const near = 0.1;	// height of near plane
	const far = (maxX + maxY + maxZ) * 3;	// height of far plane
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.set(maxX/2, maxY*0.75, maxX*2);	// where the camera is located
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

	// Add ambient light becuase otherwise the shadow from the directional light is too dark
	const intensity2 = 0.2;
	const light2 = new THREE.AmbientLight(color, intensity2);
	scene.add(light2);

	// Add ground	 
	const planeGeometry = new THREE.PlaneGeometry((maxX-minX)*2, (maxX-minX)*2);
	planeGeometry.rotateX( - Math.PI / 2 );
	const floor = new THREE.Mesh( planeGeometry, new THREE.MeshBasicMaterial( { visible: true } ) );
	floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
	floor.name = "floor";
	scene.add(floor);
	
	// Print the name of the currently selected element
	picker.setup(scene, camera);
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
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}
		renderer.render( scene, camera );
		requestAnimationFrame( render );
	}

	requestAnimationFrame(render);
}


export {extractShapes, plotIE};