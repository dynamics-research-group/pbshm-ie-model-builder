import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { geometryDetails } from './geometryHelper.js';
import { contextual_colours, material_colours, geometry_colours } from './globals.js';
import * as picker from './pickerHelper.js';


function extractShapes(rawtext){
	const data = JSON.parse(rawtext);
	const elements = data.models.irreducibleElement.elements;
	let details = [];
	let rotation;
	let faces;
	let elCoords = {};  // for locating ground connections
	let i;
	for (i=0; i<elements.length; i++){
		try {
				const element_type = elements[i].contextual.type;
				const element_name = elements[i].name;
				// Material and geometry may have two or three bits of information
				let element_material;
				try {
					element_material = [elements[i].material.type.name, elements[i].material.type.type.name, elements[i].material.type.type.type.name].join("-");
				} catch(TypeError) {
					element_material = [elements[i].material.type.name, elements[i].material.type.type.name].join("-");
				}
				let element_geom;
				try {
					element_geom = [elements[i].geometry.type.name, elements[i].geometry.type.type.name, elements[i].geometry.type.type.type.name].join("-");
				} catch(TypeError) {
					element_geom = [elements[i].geometry.type.name, elements[i].geometry.type.type.name].join("-");
				}
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
				details.push({"full_info": elements[i],
				                "element_name": element_name,
								"element_type": element_type,  // e.g. "column", "plate"
								"element_material": element_material,  // e.g. "ceramic-cement"
								"element_geometry": element_geom,  // e.g. "shell-translate-sphere"
								"shape": shape_name,  // e.g. cuboid, sphere
								"dimensions": dimensions,  // e.g. length, width, radius
								"coords": coords,  // (x,y,z) position of bottom left, front, corner of the "shape_name"
								"rotation": rotation,  // how much rotation is needed on each axis
								"method": method,  // e.g. is it translate or translateAndScale
								"faces": faces});  // used by translateAndScale
				elCoords[element_name] = coords;
		}
		catch(err) {
				// If it's not ground then the error typically occurs because
				// there are no dimensions associated with the element.
				;
		}
	}
	// If there are no element details, return this info and a network graph will instead be created
	if (details.length == 0){
		return details;
	}

	const groundLocs = getGroundLocations(data, elCoords);
	for (i=0; i<elements.length; i++){
		// Check if the error is because it's a ground element
		if (elements[i].type == "ground") {
			details.push({"full_info": elements[i],
						"element_name": elements[i].name,
						"element_type": "ground",
						"shape": "sphere",
						"dimensions": {"radius":1},
						"coords": groundLocs[elements[i].name],
						"rotation": undefined,
						"method": "translate",
						"faces": undefined});
		}
	}
	
	return details;
}


function getGroundLocations(data, elCoords){
	const elements = data.models.irreducibleElement.elements;
	const relationships  = data.models.irreducibleElement.relationships;
	let ground_element_names = [];
	let locations = {};
	for (var i=0; i<elements.length; i++){
		if (elements[i].type == "ground") {
			ground_element_names.push(elements[i].name)
		}
	}
	let n1, n2, coords;
	let nameMatch, otherEl;
	for (i=0; i<relationships.length; i++){
        n1 = relationships[i].elements[0].name;
        n2 = relationships[i].elements[1].name;
		nameMatch = undefined;
		otherEl = undefined;
		if (ground_element_names.includes(n1)) {
			nameMatch = n1;
			otherEl = n2;
		} 
		else if (ground_element_names.includes(n2)) {
			nameMatch = n2;
			otherEl = n1;
		}
		if (nameMatch != undefined) {
			try {
				// Check if coordinates are given
				coords = [relationships[i].elements[0].coordinates.global.translational.x.value,
						  relationships[i].elements[0].coordinates.global.translational.y.value,
				          relationships[i].elements[0].coordinates.global.translational.z.value];
				
			} catch {
				// If not, then find out where the other relationship element is.
				coords = elCoords[otherEl];
			}
			locations[nameMatch] = coords;
		}
	}
	return locations;
}


function plotIE(shapes) {
	const canvas = document.querySelector('#c');
	const renderer = new THREE.WebGLRenderer({antialias: true, canvas});
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	// Some shapes are too big to easily display, so find the range
	// of x, y and z values (for calculating FOV) and then scale them down.
	let elements = [];  // for accessing all IEs in the model
	let minX = 0;
	let minZ = 0;
	let maxX = 0;
	let maxY = 0;
	let maxZ = 0;
	const scaleFactor = 100;
	for (let i=0; i<shapes.length; i++){
		const shape = geometryDetails(shapes[i], scaleFactor);
		maxX = Math.max(maxX, shape.position.x);
		maxY = Math.max(maxY, shape.position.y);
		maxZ = Math.max(maxZ, shape.position.z);
		minX = Math.min(minX, shape.position.x);
		minZ = Math.min(minZ, shape.position.z);
		scene.add(shape);
		elements.push(shape);
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


	// GUI for changing the colour scheme
	const gui = new GUI();
	gui.add({colour_scheme:'contextual'},
	        'colour_scheme', ['contextual', 'material', 'geometry']).onChange( value => {updateColourScheme(value)} );
	

	function updateColourScheme(scheme){
		if (scheme == "material") {
			for (let i=0; i<elements.length; i++) {
				if (elements[i].el_contextual != "ground") {
					elements[i].material.color.setHex(material_colours[elements[i].el_material]);
				}
			}
		} else if (scheme == "contextual") {
			for (let i=0; i<elements.length; i++) {
				elements[i].material.color.setHex(contextual_colours[elements[i].el_contextual]);
			}
		} else if (scheme == "geometry") {
			for (let i=0; i<elements.length; i++) {
				if (elements[i].el_contextual != "ground") {
					elements[i].material.color.setHex(geometry_colours[elements[i].el_geometry]);
				}
			}
		}
	}

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