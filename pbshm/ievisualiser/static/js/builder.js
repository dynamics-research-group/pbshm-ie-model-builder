import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import {ObliqueCylinderGeometry} from './obliqueCylinder.js';
import {TrapezoidGeometry} from './trapezoid.js'
import {generateBeam} from './geometryHelper.js';
import {glToJson, jsonToGl} from './translationHelper.js';
import { builderColours, addColourFolders, contextualColours, materialColours, geometryColours,
	     cElements, materialColourKeys, contextualColourKeys,
	     makeContextColourVisible, makeMaterialColourVisible, makeGeometryColourVisible} from './colourHelper.js';


let camera, scene, renderer, controls;
let plane;
let pointer, raycaster, isShiftDown = false;


// Gui handlers
const gui = new GUI();
addColourFolders(gui, render, "builder");
const elementFolder = gui.addFolder('Element');
const elName = {'Name': ''}
elementFolder.add(elName, 'Name').onChange(updateElementName);
elementFolder.hide();
let floorFolder, boxFolder, sphereFolder, cylinderFolder, obliqueCylinderFolder, trapezoidFolder, beamFolder, folders, currentFolder;


// Coordinates folders
const posParams = {'x': 0,
  				   'y': 0,
				   'z': 0};
const rotateParams = {'x': 0,
					  'y': 0,
					  'z': 0}
const coordsFolder = elementFolder.addFolder('Coordinates');
const transFolder = coordsFolder.addFolder('Translational');
const rotFolder = coordsFolder.addFolder('Rotational');
transFolder.add(posParams, 'x').onChange(moveGeometryX);
transFolder.add(posParams, 'y').onChange(moveGeometryY);
transFolder.add(posParams, 'z').onChange(moveGeometryZ);
rotFolder.add(rotateParams, 'x', 0, 360).onChange(rotateGeometryX);
rotFolder.add(rotateParams, 'y', 0, 360).onChange(rotateGeometryY);
rotFolder.add(rotateParams, 'z', 0, 360).onChange(rotateGeometryZ);

// Material information
const material = {"Type": "other"};
const materialFolder = elementFolder.addFolder('Material');
materialFolder.add(material, 'Type', materialColourKeys).onChange(updateMaterial);


// Contextual information
const context = {'Type': 'other'};
const typeFolder = elementFolder.addFolder('Contextual');
typeFolder.add(context, 'Type', contextualColourKeys).onChange(updateContext);


// Geometry information
const geometry = {"Type": undefined}
const jsonGeometryMappings = {"box": ["solid-translate-cuboid", "shell-translate-cuboid",
                                       "solid-translate-other", "shell-translate-other", "other"], 
                              "sphere": ["solid-translate-sphere", "shell-translate-sphere",
                                         "solid-translate-other", "shell-translate-other", "other"], 
                              "cylinder": ["solid-translate-cylinder", "shell-translate-cylinder",
                                           "solid-translate-other", "shell-translate-other", "other"], 
                              "beam": ["beam-rectangular", "beam-i-beam", "beam-other", "other"], 
                              "trapezoid": ["solid-translateAndScale-cuboid", "shell-translateAndScale-cuboid",
                                            "solid-translateAndScale-other", "shell-translateAndScale-other", "other"], 
                              "obliqueCylinder": ["solid-translateAndScale-cylinder", "shell-translateAndScale-cylinder",
                                                  "solid-translateAndScale-other", "shell-translateAndScale-other", "other"]};
const geometryKeys = Object.keys(jsonGeometryMappings);
geometryKeys.sort();
const geometryFolder = elementFolder.addFolder('Geometry');
for (let i=0; i<geometryKeys.length; i++){
	geometryFolder.add(geometry, 'Type', jsonGeometryMappings[geometryKeys[i]]).onChange(updateJsonGeometry);
	geometryFolder.children[i].hide();
}
geometryFolder.hide();


// Geometry folders
const floorParams = {'width': 1000,
					 'depth': 1000};
const boxParams = {'length': 50,
                   'height': 50,
				   'width': 50};
const sphereParams = {'radius': 25}
const cylinderParams = {'radius': 25,
   			   		    'length': 50}
const obliqueCylinderParams = {'Faces left radius': 25,
   			   		    	   'Faces right radius': 25,
							   'Faces Left Trans. y': 0,
							   'Faces Left Trans. z': 0,
							   'Faces Right Trans. y': 0,
							   'Faces Right Trans. z': 0,
 							   'length': 50}
const trapezoidParams = {"Faces Left Trans. y": 10,
						 "Faces Left Trans. z": 10,
						 "Faces Left Height": 20,
						 "Faces Left Width": 20,
						 "Faces Right Trans. y": 0,
						 "Faces Right Trans. z": 0,
						 "Faces Right Height": 40,
						 "Faces Right Width": 40,
						 "length": 50}
const beamParams = {"length": 80,
				    "h": 40,
				    "s": 10,
				    "t": 10,
				    "b": 30}



let rollOverMesh;
let cubeGeo, sphereGeo, cylinderGeo, obliqueCylinderGeo, trapezoidGeo, iBeamGeo, cBeamGeo;
const rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
const rollOverCubeGeo = new THREE.BoxGeometry(boxParams.length, boxParams.height, boxParams.width);
const rollOverSphereGeo = new THREE.SphereGeometry(sphereParams.radius);
const rollOverCylinderGeo = new THREE.CylinderGeometry(cylinderParams.radius, cylinderParams.radius, cylinderParams.length);
const rollOverObliqueCylinderGeo = new ObliqueCylinderGeometry(obliqueCylinderParams['Faces left radius'],
															   obliqueCylinderParams['Faces left radius'],
															   obliqueCylinderParams.length,
															   obliqueCylinderParams['Faces Right Trans. y']  - obliqueCylinderParams['Faces Left Trans. y'] ,
															   -(obliqueCylinderParams['Faces Right Trans. z']  - obliqueCylinderParams['Faces Left Trans. z']));
const rollOverTrapezoidGeo = new TrapezoidGeometry(trapezoidParams['Faces Left Trans. y'], trapezoidParams['Faces Left Trans. z'],
												   trapezoidParams['Faces Left Height'], trapezoidParams['Faces Left Width'],
												   trapezoidParams['Faces Right Trans. y'], trapezoidParams['Faces Right Trans. z'],
												   trapezoidParams['Faces Right Height'], trapezoidParams['Faces Right Width'],
												   trapezoidParams.length);
const rollOverIBeamGeo = generateBeam("i-beam", beamParams.length, beamParams.h, beamParams.s, beamParams.t, beamParams.b);
const rollOverCBeamGeo = generateBeam("c-beam", beamParams.length, beamParams.h, beamParams.s, beamParams.t, beamParams.b);
rollOverCylinderGeo.rotateZ(Math.PI/2);
rollOverObliqueCylinderGeo.rotateZ(Math.PI/2);
let planeGeometry;

let currentId;  // name of the new geometry object to be added
let currentGeometry;
let currentObject;  // specific existing object to be edited
const objects = [];  // list of all objects in the scene


init();
render();


function init() {

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, 500, 1300 );
	camera.lookAt( 0, 0, 0 );

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	// Give the user the ability to control the camera
	controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 0, 0);	// where the camera looks
	// Only render when the user moves the camera
	controls.addEventListener("change", () => renderer.render(scene, camera));
	controls.update();
	
	// Roll-over helpers
	rollOverMesh = new THREE.Mesh(rollOverIBeamGeo, rollOverMaterial);
	rollOverMesh.visible = false;
	scene.add( rollOverMesh );

	// Default geometries on generation
	cubeGeo = new THREE.BoxGeometry(boxParams.length, boxParams.height, boxParams.width);
	sphereGeo = new THREE.SphereGeometry(sphereParams.radius);
	cylinderGeo = new THREE.CylinderGeometry(cylinderParams.radius, cylinderParams.radius, cylinderParams.length);
	obliqueCylinderGeo = new ObliqueCylinderGeometry(obliqueCylinderParams['Faces left radius'],
													 obliqueCylinderParams['Faces right radius'],
													 obliqueCylinderParams.length,
													 obliqueCylinderParams['Faces Right Trans. y']  - obliqueCylinderParams['Faces Left Trans. y'] ,
													 -(obliqueCylinderParams['Faces Right Trans. z']  - obliqueCylinderParams['Faces Left Trans. z']));
	trapezoidGeo = new TrapezoidGeometry(10, 10, 20, 20, 0, 0, 40, 40, 50);
	iBeamGeo = generateBeam("i-beam", beamParams.length, beamParams.h, beamParams.s, beamParams.t, beamParams.b);
	cBeamGeo = generateBeam("c-beam", beamParams.length, beamParams.h, beamParams.s, beamParams.t, beamParams.b);
	
	// To detect where the user has clicked
	raycaster = new THREE.Raycaster();
	pointer = new THREE.Vector2();

	// Draw the floor
	planeGeometry = new THREE.PlaneGeometry(floorParams.width, floorParams.depth );
	planeGeometry.rotateX( - Math.PI / 2 );
	plane = new THREE.Mesh( planeGeometry, new THREE.MeshBasicMaterial( { visible: true } ) );
	plane.name = "plane";
	scene.add( plane );
	objects.push( plane );

	// Lights
	const ambientLight = new THREE.AmbientLight( 0x606060, 3 );
	scene.add( ambientLight );

	const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );


	document.addEventListener( 'pointermove', onPointerMove );
	document.addEventListener( 'pointerdown', onPointerDown );
	document.addEventListener( 'keydown', onDocumentKeyDown );
	document.addEventListener( 'keyup', onDocumentKeyUp );
	
	document.querySelectorAll( '#ui .tiles input[type=radio][name=voxel]' ).forEach( ( elem ) => {
		elem.addEventListener( 'click', allowUncheck );
	} );
	document.querySelectorAll( '#uitwo .tiles input[type=radio][name=voxel]' ).forEach( ( elem ) => {
		elem.addEventListener( 'click', allowUncheck );
	} );

	window.addEventListener( 'resize', onWindowResize );

	
	initBoxGui()
	initSphereGui();
	initCylinderGui();
	initObliqueCylinderGui();
	initTrapezoidGui();
	initBeamGui();
	initGroundGui();  // Not added to list of folders so it is always visible
	folders = [boxFolder, sphereFolder, cylinderFolder, obliqueCylinderFolder, trapezoidFolder, beamFolder];
	folders.forEach(folder => folder.hide()); // Initially hide all folders, then show only the ones we want when required

}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}


function onPointerMove( event ) {
	if (currentId != undefined){
		pointer.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
		raycaster.setFromCamera( pointer, camera );
		const intersects = raycaster.intersectObjects( objects, false );
		if ( intersects.length > 0 ) {
			const intersect = intersects[ 0 ];
			rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
			rollOverMesh.position.addScalar(25);
			render();
		}
	}
}


function onPointerDown( event ) {
	pointer.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
	raycaster.setFromCamera( pointer, camera );
	const intersects = raycaster.intersectObjects( objects, false );
	if ( intersects.length > 0 ) {
		const intersect = intersects[ 0 ];
		if ( isShiftDown ) {
			// delete object
			if ( intersect.object !== plane ) {
				scene.remove( intersect.object );
				objects.splice( objects.indexOf( intersect.object ), 1 );
				cElements.splice( cElements.indexOf( intersect.object ), 1 );
			}
		} else {
			if (currentId != undefined){
				if (currentId == "cube"){
					currentGeometry = new THREE.BoxGeometry(boxParams.length, boxParams.height, boxParams.width);;
				} else if (currentId == "sphere"){
					currentGeometry = new THREE.SphereGeometry(sphereParams.radius);;
				} else if (currentId == "cylinder"){
					currentGeometry = new THREE.CylinderGeometry(cylinderParams.radius, cylinderParams.radius, cylinderParams.length);;
					// Rotate because cylinder is assumed horizontal in json but vertical in webGL
					currentGeometry.rotateZ(Math.PI/2);
				} else if (currentId == "obliqueCylinder"){
					currentGeometry = new ObliqueCylinderGeometry(obliqueCylinderParams['Faces left radius'],
						obliqueCylinderParams['Faces right radius'],
						obliqueCylinderParams.length,
						obliqueCylinderParams['Faces Right Trans. y']  - obliqueCylinderParams['Faces Left Trans. y'] ,
						-(obliqueCylinderParams['Faces Right Trans. z']  - obliqueCylinderParams['Faces Left Trans. z']));
					currentGeometry.parameters['Faces Left Trans. y'] = obliqueCylinderParams['Faces Left Trans. y']
					currentGeometry.parameters['Faces Left Trans. z'] = obliqueCylinderParams['Faces Left Trans. z']
					currentGeometry.parameters['Faces Right Trans. y'] = obliqueCylinderParams['Faces Right Trans. y']
					currentGeometry.parameters['Faces Right Trans. z'] = obliqueCylinderParams['Faces Right Trans. z']
					// Rotate because cylinder is assumed horizontal in json but vertical in webGL
					currentGeometry.rotateZ(Math.PI/2);
				} else if (currentId == "trapezoid"){
					currentGeometry = new TrapezoidGeometry(10, 10, 20, 20, 0, 0, 40, 40, 50);
				} else if (currentId == "ibeam"){
					currentGeometry = generateBeam("i-beam", beamParams.length, beamParams.h, beamParams.s, beamParams.t, beamParams.b);;
				} else if (currentId == "cbeam"){
					currentGeometry = generateBeam("c-beam", beamParams.length, beamParams.h, beamParams.s, beamParams.t, beamParams.b);;
				}

				// create new object
				const voxel = new THREE.Mesh(currentGeometry, new THREE.MeshLambertMaterial({color: builderColours[currentGeometry.type]}));
				voxel.position.copy( intersect.point ).add( intersect.face.normal );
				voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
				// We need to know the current angle so that when we change the object's angle we don't
				// have a cumulative effect of rotations for each rotation we make.
				voxel.currentAngleX = 0;
				voxel.currentAngleY = 0;
				voxel.currentAngleZ = 0;
				voxel.contextual_type = undefined;
				voxel.material_type = undefined;
				scene.add( voxel );
				objects.push( voxel );
				currentObject = voxel;
				cElements.push(voxel);
			} else {
				// select existing object to edit unless it's the floor
				if (intersect.object.name != "plane") {
					currentObject = intersect.object;
				}
			}
			folders.forEach(folder => folder.hide());
			const geometryType = currentObject.geometry.type;
			if (geometryType == "BoxGeometry"){
				boxFolder.children[0].setValue(currentObject.geometry.parameters.width);
				boxFolder.children[1].setValue(currentObject.geometry.parameters.height);
				boxFolder.children[2].setValue(currentObject.geometry.parameters.depth);
				currentFolder = boxFolder;
				showGeometryDropdown("box");
			} else if (geometryType == "SphereGeometry"){
				sphereFolder.children[0].setValue(currentObject.geometry.parameters.radius);
				currentFolder = sphereFolder;
				showGeometryDropdown("sphere");
			} else if (geometryType == "CylinderGeometry"){
				cylinderFolder.children[0].setValue(currentObject.geometry.parameters.radiusTop);
				cylinderFolder.children[1].setValue(currentObject.geometry.parameters.height);
				currentFolder = cylinderFolder;
				showGeometryDropdown("cylinder");
			} else if (geometryType == "ObliqueCylinderGeometry"){
				obliqueCylinderFolder.children[0].setValue(currentObject.geometry.parameters.radiusTop);
				obliqueCylinderFolder.children[1].setValue(currentObject.geometry.parameters.radiusBottom);
				obliqueCylinderFolder.children[2].setValue(currentObject.geometry.parameters.height);
				obliqueCylinderFolder.children[3].setValue(currentObject.geometry.parameters['Faces Left Trans. y']);
				obliqueCylinderFolder.children[4].setValue(currentObject.geometry.parameters['Faces Left Trans. z']);
				obliqueCylinderFolder.children[5].setValue(currentObject.geometry.parameters['Faces Right Trans. y']);
				obliqueCylinderFolder.children[6].setValue(currentObject.geometry.parameters['Faces Right Trans. z']);
				currentFolder = obliqueCylinderFolder;
				showGeometryDropdown("obliqueCylinder");
			} else if  (geometryType == "TrapezoidGeometry"){
				trapezoidFolder.children[0].setValue(currentObject.geometry.parameters.leftTransY);
				trapezoidFolder.children[1].setValue(currentObject.geometry.parameters.leftTransZ);
				trapezoidFolder.children[2].setValue(currentObject.geometry.parameters.leftDimensY);
				trapezoidFolder.children[3].setValue(currentObject.geometry.parameters.leftDimensZ);
				trapezoidFolder.children[4].setValue(currentObject.geometry.parameters.rightTransY);
				trapezoidFolder.children[5].setValue(currentObject.geometry.parameters.rightTransZ);
				trapezoidFolder.children[6].setValue(currentObject.geometry.parameters.rightDimensY);
				trapezoidFolder.children[7].setValue(currentObject.geometry.parameters.rightDimensZ);
				trapezoidFolder.children[8].setValue(currentObject.geometry.parameters.width);
				currentFolder = trapezoidFolder;
				showGeometryDropdown("trapezoid");
			} else if (geometryType == "IBeamGeometry" || geometryType == "CBeamGeometry"){
				beamFolder.children[0].setValue(currentObject.geometry.parameters["width"]);
				beamFolder.children[1].setValue(currentObject.geometry.parameters["h"]);
				beamFolder.children[2].setValue(currentObject.geometry.parameters["s"]);
				beamFolder.children[3].setValue(currentObject.geometry.parameters["t"]);
				beamFolder.children[4].setValue(currentObject.geometry.parameters["b"]);
				currentFolder = beamFolder;
				showGeometryDropdown("beam");
			} else {
				// Need to deselect if we click away so we don't accidentally edit something else (e.g. the plane)
				currentFolder = undefined;
			}
			// If the ground plane has been selected, or anywhere outside of this then there'll be no current folder.
			if (currentFolder != undefined){
				elementFolder.children[0].setValue(currentObject.name);
				transFolder.children[0].setValue(glToJson(currentObject, "x", currentObject.position.x));
				transFolder.children[1].setValue(glToJson(currentObject, "y", currentObject.position.y));
				transFolder.children[2].setValue(glToJson(currentObject, "z", currentObject.position.z));
				rotFolder.children[0].setValue(currentObject.rotation.x * (180 / Math.PI));
				rotFolder.children[1].setValue(currentObject.rotation.y * (180 / Math.PI));
				rotFolder.children[2].setValue(currentObject.rotation.z * (180 / Math.PI));
				typeFolder.children[0].setValue(currentObject.el_contextual);
				materialFolder.children[0].setValue(currentObject.el_material);
				elementFolder.show();
				coordsFolder.show();
				typeFolder.show();
				materialFolder.show();
				currentFolder.show();
			}
		}
	}
	render();
}


function onDocumentKeyDown( event ) {
	switch ( event.keyCode ) {
		case 16: // shift
			isShiftDown = true;
			break;
		// case 37:  // left
		// 	currentFolder.children[0].setValue(currentObject.position.x - 10);
		// 	break;
		// case 38:  // up
		// 	currentFolder.children[2].setValue(currentObject.position.z - 10);
		// 	break;
		// case 39:  // right
		// 	currentFolder.children[0].setValue(currentObject.position.x + 10);
		// 	break;
		// case 40:  // down
		// 	currentFolder.children[2].setValue(currentObject.position.z + 10);
		// 	break;
		// case 83:  // s
		// 	currentFolder.children[1].setValue(currentObject.position.y - 10);
		// 	break;
		// case 87:  // w
		// 	currentFolder.children[1].setValue(currentObject.position.y + 10);
		// 	break;
	}
	render();
}


function onDocumentKeyUp( event ) {
	switch ( event.keyCode ) {
		case 16: isShiftDown = false; break;
	}
}


function allowUncheck() {
	if ( this.id === currentId ) {
		this.checked = false;
		currentId = undefined;
		rollOverMesh.visible = false;
	} else {
		currentId = this.id;
		rollOverMesh.geometry.dispose()
		if (currentId == "cube"){
			rollOverMesh.geometry = rollOverCubeGeo;
			currentFolder = boxFolder;
		} else if (currentId == "sphere"){
			rollOverMesh.geometry = rollOverSphereGeo;
			currentFolder = sphereFolder;
		} else if (currentId == "cylinder"){
			rollOverMesh.geometry = rollOverCylinderGeo;
			currentFolder = cylinderFolder;	
		} else if (currentId == "obliqueCylinder"){
			rollOverMesh.geometry = rollOverObliqueCylinderGeo;
			currentFolder = obliqueCylinderFolder;
		} else if (currentId == "trapezoid"){
			rollOverMesh.geometry = rollOverTrapezoidGeo;
			currentFolder = trapezoidFolder;
		} else if (currentId == "ibeam"){
			rollOverMesh.geometry = rollOverIBeamGeo;
			currentFolder = beamFolder;
		} else if (currentId == "cbeam"){
			rollOverMesh.geometry = rollOverCBeamGeo;
			currentFolder = beamFolder;
		}
		rollOverMesh.visible = true;
	}
	folders.forEach(folder => folder.hide());
	
}

function updateGeometry(mesh, geometry){
	mesh.geometry.dispose();
	mesh.geometry = geometry;
	render();
}


function initGroundGui(){
	floorFolder = gui.addFolder('Ground dimensions (visual only)');
	floorFolder.add(floorParams, 'width').onChange(generateGeometry);
	floorFolder.add(floorParams, 'depth').onChange(generateGeometry);

	function generateGeometry(){
		planeGeometry = new THREE.PlaneGeometry( floorParams.width, floorParams.depth );
		planeGeometry.rotateX( - Math.PI / 2 );
		updateGeometry(plane, planeGeometry);
	}
}


function updateElementName(){
	currentObject.name = elName.Name;
}


// It's necessary to handle each dimension separately,
// otherwise the object's position attributes can get overwritten by whatever old values
// are in the gui before the gui has been updated to show the parameters.
// of the object that has just been selected.
function moveGeometryX(){
	currentObject.position.x = jsonToGl(currentObject, "x", posParams.x);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function moveGeometryY(){
	currentObject.position.y = jsonToGl(currentObject, "y", posParams.y);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function moveGeometryZ(){
	currentObject.position.z = jsonToGl(currentObject, "z", posParams.z);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function rotateGeometryX(){
	const newAngle = rotateParams.x * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleX;
	currentObject.rotateX(rotation);
	currentObject.currentAngleX = newAngle;
	if (!currentObject.isGroup){
		currentObject.geometry.attributes.position.needsUpdate = true;
	}
	render();
}


function rotateGeometryY(){
	const newAngle = rotateParams.y * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleY;
	currentObject.rotateY(rotation);
	currentObject.currentAngleY = newAngle;
	if (!currentObject.isGroup){
		currentObject.geometry.attributes.position.needsUpdate = true;
	}
	render();
}


function rotateGeometryZ(){
	const newAngle = rotateParams.z * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleZ;
	currentObject.rotateZ(rotation);
	currentObject.currentAngleZ = newAngle;
	if (!currentObject.isGroup){
		currentObject.geometry.attributes.position.needsUpdate = true;
	}
	render();
}


function updateContext(){
	currentObject.el_contextual = context.Type;
	makeContextColourVisible(context.Type);
	if (gui.children[0].children[0].getValue() == "contextual") {
		currentObject.material.color.setHex(contextualColours[currentObject.el_contextual]);
	}
	render();
}


function updateMaterial(){
	currentObject.el_material = material.Type;
	makeMaterialColourVisible(material.Type);
	if (gui.children[0].children[0].getValue() == "material") {
		currentObject.material.color.setHex(materialColours[currentObject.el_material]);
	}
	render();
}


function updateJsonGeometry(){
	currentObject.el_geometry = geometry.Type;
	makeGeometryColourVisible(geometry.Type);
	if (gui.children[0].children[0].getValue() == "geometry") {
		currentObject.material.color.setHex(geometryColours[currentObject.el_geometry]);
	}
	render();
}

function showGeometryDropdown(geom){
	// Hide whichever geometry dropdown is on display
	for (let i=0; i<geometryKeys.length; i++){
		geometryFolder.children[i].hide();
	}
	// Show the desired dropdown
	geometryFolder.show();
	const idx = geometryKeys.indexOf(geom)
	geometryFolder.children[idx].show();
	geometryFolder.children[idx].setValue(currentObject.el_geometry);
}


function initBoxGui(){
	boxFolder = elementFolder.addFolder('Geometry Dimensions');
	boxFolder.add(boxParams, 'length').onChange(value => updateParameters("width", value));
	boxFolder.add(boxParams, 'height').onChange(value => updateParameters("height", value));
	boxFolder.add(boxParams, 'width').onChange(value => updateParameters("depth", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
						new THREE.BoxGeometry(newParams.width, newParams.height, newParams.depth));
			if (changedParam == "height"){
				posParams.y = 0;
				moveGeometryY();
			}
		}
	}
}
  

function initSphereGui(){
	sphereFolder = elementFolder.addFolder('Geometry Dimensions');
	sphereFolder.add(sphereParams, 'radius').onChange(updateParameters);
	function updateParameters(){
		if (currentObject.geometry.parameters.radius != sphereParams.radius) {
			updateGeometry(currentObject, new THREE.SphereGeometry(sphereParams.radius));
			if (currentObject.position.y < sphereParams.radius){
				posParams.y = 0;
				moveGeometryY();
			}
		}
	}
}


function initCylinderGui(){
	cylinderFolder = elementFolder.addFolder('Geometry Dimensions');
	cylinderFolder.add(cylinderParams, 'radius').onChange(value => updateParameters("radiusTop", value));
	cylinderFolder.add(cylinderParams, 'length').onChange(value => updateParameters("length", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			if (changedParam == "radiusTop"){
				newParams["radiusBottom"] = value;  // they must be the same
			}
			updateGeometry(currentObject,
						new THREE.CylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.length));
			currentObject.geometry.rotateZ(Math.PI/2);
			render();
			// if (changedParam == "height"){
			// 	posParams.y = 0;
			// 	moveGeometryY();
			// }
		}
	}
}


function initObliqueCylinderGui(){
	obliqueCylinderFolder = elementFolder.addFolder('Geometry Dimensions');
	obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces left radius').onChange(value => updateParameters("radiusTop", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces right radius').onChange(value => updateParameters("radiusBottom", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'length').onChange(value => updateParameters("height", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Left Trans. y').onChange(value => updateParameters("leftTransY", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Left Trans. z').onChange(value => updateParameters("leftTransZ", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Right Trans. y').onChange(value => updateParameters("rightTransY", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Right Trans. z').onChange(value => updateParameters("rightTransZ", value));
	function updateParameters(changedParam, value){
		if (changedParam == "leftTransY" || changedParam == "rightTransY"){
			changedParam = "topSkewX";
			value = obliqueCylinderParams['Faces Right Trans. y']  - obliqueCylinderParams['Faces Left Trans. y'];
		} else if (changedParam == "leftTransZ" || changedParam == "rightTransZ"){
			changedParam = "topSkewZ";
			value = -(obliqueCylinderParams['Faces Right Trans. z']  - obliqueCylinderParams['Faces Left Trans. z']);
		}
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
						new ObliqueCylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.height,
							                        newParams.topSkewX, newParams.topSkewZ));
			currentObject.geometry.rotateZ(Math.PI/2);
			currentObject.geometry.parameters['Faces Left Trans. y'] = obliqueCylinderParams['Faces Left Trans. y']
			currentObject.geometry.parameters['Faces Left Trans. z'] = obliqueCylinderParams['Faces Left Trans. z']
			currentObject.geometry.parameters['Faces Right Trans. y'] = obliqueCylinderParams['Faces Right Trans. y']
			currentObject.geometry.parameters['Faces Right Trans. z'] = obliqueCylinderParams['Faces Right Trans. z']
			render();
			// if (changedParam == "height"){
			// 	posParams.y = 0;
			// 	moveGeometryY();
			// }
		}
	}
}




function initTrapezoidGui(){
	trapezoidFolder = elementFolder.addFolder('Geometry Dimensions');
	trapezoidFolder.add(trapezoidParams, "Faces Left Trans. y").onChange(value => updateParameters("leftTransY", value));
	trapezoidFolder.add(trapezoidParams, "Faces Left Trans. z").onChange(value => updateParameters("leftTransZ", value));
	trapezoidFolder.add(trapezoidParams, "Faces Left Height").onChange(value => updateParameters("leftDimensY", value));
	trapezoidFolder.add(trapezoidParams, "Faces Left Width").onChange(value => updateParameters("leftDimensZ", value));
	trapezoidFolder.add(trapezoidParams, "Faces Right Trans. y").onChange(value => updateParameters("rightTransY", value));
	trapezoidFolder.add(trapezoidParams, "Faces Right Trans. z").onChange(value => updateParameters("rightTransZ", value));
	trapezoidFolder.add(trapezoidParams, "Faces Right Height").onChange(value => updateParameters("rightDimensY", value));
	trapezoidFolder.add(trapezoidParams, "Faces Right Width").onChange(value => updateParameters("rightDimensZ", value));
	trapezoidFolder.add(trapezoidParams, "length").onChange(value => updateParameters("width", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
				new TrapezoidGeometry(newParams.leftTransY, newParams.leftTransZ, newParams.leftDimensY, newParams.leftDimensZ,
									newParams.rightTransY, newParams.rightTransZ, newParams.rightDimensY, newParams.rightDimensZ,
									newParams.width));
		}
	}
}


function initBeamGui(){
	beamFolder = elementFolder.addFolder('Geometry Dimensions');
	beamFolder.add(beamParams, "length").onChange(value => updateParameters("width", value));
	beamFolder.add(beamParams, "h").onChange(value => updateParameters("h", value));
	beamFolder.add(beamParams, "s").onChange(value => updateParameters("s", value));
	beamFolder.add(beamParams, "t").onChange(value => updateParameters("t", value));
	beamFolder.add(beamParams, "b").onChange(value => updateParameters("b", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			let newGeom;
			if (currentObject.geometry.type == "IBeamGeometry") {
				newGeom = generateBeam("i-beam", newParams.width, newParams.h, newParams.s, newParams.t, newParams.b, posParams.x, posParams.y, posParams.z);
			} else {
				newGeom = generateBeam("c-beam", newParams.width, newParams.h, newParams.s, newParams.t, newParams.b, posParams.x, posParams.y, posParams.z);
			}
			currentObject.geometry.dispose();
			currentObject.geometry = newGeom;
			if (changedParam == "h"){
				posParams.y = 0;
				moveGeometryY();
			}
			render();
		}
	}
}



function render() {
	renderer.render( scene, camera );
}


