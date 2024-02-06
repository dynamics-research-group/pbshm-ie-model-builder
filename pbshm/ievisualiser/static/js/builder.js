import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import {ObliqueCylinderGeometry} from './obliqueCylinder.js';
import {TrapezoidGeometry} from './trapezoid.js'
import {generateBeam} from './geometryHelper.js';
import {glToJson, jsonToGl} from './translationHelper.js';


let camera, scene, renderer, controls;
let plane;
let pointer, raycaster, isShiftDown = false;


// Gui handlers
const gui = new GUI();
const elementFolder = gui.addFolder('Element');
const elName = {'Name': ''}
elementFolder.add(elName, 'Name').onChange(updateElementName);
let floorFolder, boxFolder, sphereFolder, obliqueCylinderFolder, trapezoidFolder, beamFolder, folders, currentFolder;


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
const materialTypes = ["metal-ferrousAlloy-steel", "metal-ferrousAlloy-iron", "metal-aluminiumAlloy",
					   "metal-nickelAlloy", "metal-copperAlloy", "metal-titaniumAlloy", "ceramic-glass",
					   "ceramic-clayProduct", "ceramic-refractory", "ceramic-abrasive", "ceramic-cement",
					   "ceramic-advancedCeramic", "polymer-thermoplastic", "polymer-thermoset", "polymer-elastomer",
					   "composite-particleReinforced", "composite-fibreReinforced", "composite-structural"];
materialFolder.add(material, 'Type', materialTypes).onChange(updateMaterial);


// Contextual information
const context = {'Type': 'other'};
const typeFolder = elementFolder.addFolder('Contextual');
const contextualTypes = ["slab", "column", "beam", "block", "cable", "wall", "ground",
                          "plate", "deck", "aerofoil", "wing", "fuselage", "tower", "wheel", "other"];
typeFolder.add(context, 'Type', contextualTypes).onChange(updateContext);


// Geometry folders
const floorParams = {'width': 1000,
					 'depth': 1000};
const boxParams = {'width': 50,
                   'height': 50,
				   'depth': 50};
const sphereParams = {'radius': 25}
const obliqueCylinderParams = {'top_radius': 25,
   			   		    	   'bottom_radius': 25,
					           'height': 50,
					           'top_skew_x': 0,
					           'top_skew_z': 0}
const trapezoidParams = {"leftTransY": 10,
						 "leftTransZ": 10,
						 "leftDimensY": 20,
						 "leftDimensZ": 20,
						 "rightTransY": 0,
						 "rightTransZ": 0,
						 "rightDimensY": 40,
						 "rightDimensZ": 40,
						 "width": 50}
const beamParams = {"width": 80,
				    "h": 40,
				    "s": 10,
				    "t": 10,
				    "b": 30}


// Geometry materials (for webgl buffers)
const boxMaterial = new THREE.MeshLambertMaterial( { color: 0xe6194b} );
const sphereMaterial = new THREE.MeshLambertMaterial( { color: 0x3cb44b} );
const cylinderMaterial = new THREE.MeshLambertMaterial( { color: 0xffe119} );
const trapezoidMaterial = new THREE.MeshLambertMaterial( { color: 0x4363d8} );
const beamMaterial = new THREE.MeshLambertMaterial( { color: 0xf58231} );
const obliqueCylinderMaterial = new THREE.MeshLambertMaterial( { color: 0xF8DE7E} );
const materials = {"BoxGeometry": boxMaterial,
				   "SphereGeometry": sphereMaterial,
				   "ObliqueCylinderGeometry": obliqueCylinderMaterial,
				   "TrapezoidGeometry": trapezoidMaterial,
				   "BeamGeometry": beamMaterial}


let rollOverMesh;
let cubeGeo, sphereGeo, obliqueCylinderGeo, trapezoidGeo, beamGeo;
const rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
const rollOverCubeGeo = new THREE.BoxGeometry(boxParams.width, boxParams.height, boxParams.depth);
const rollOverSphereGeo = new THREE.SphereGeometry(sphereParams.radius);
const rollOverObliqueCylinderGeo = new ObliqueCylinderGeometry(obliqueCylinderParams.top_radius,
															   obliqueCylinderParams.top_radius,
															   obliqueCylinderParams.height,
															   obliqueCylinderParams.top_skew_x,
															   obliqueCylinderParams.top_skew_z);
const rollOverTrapezoidGeo = new TrapezoidGeometry(trapezoidParams.leftTransY, trapezoidParams.leftTransZ,
												   trapezoidParams.leftDimensY, trapezoidParams.leftDimensZ,
												   trapezoidParams.rightTransY, trapezoidParams.rightTransZ,
												   trapezoidParams.rightDimensY, trapezoidParams.rightDimensZ,
												   trapezoidParams.width);
const rollOverBeamGeo = generateBeam("i-beam", beamParams.width, beamParams.h, beamParams.s, beamParams.t, beamParams.b);
let planeGeometry;

let currentVoxel = 0;  // new generic object to be added
let currentId;
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
	rollOverMesh = new THREE.Mesh(rollOverBeamGeo, rollOverMaterial);
	rollOverMesh.visible = false;
	scene.add( rollOverMesh );

	// Default geometries on generation
	cubeGeo = new THREE.BoxGeometry(boxParams.width, boxParams.height, boxParams.depth);
	sphereGeo = new THREE.SphereGeometry(sphereParams.radius);
	obliqueCylinderGeo = new ObliqueCylinderGeometry(obliqueCylinderParams.top_radius,
													 obliqueCylinderParams.bottom_radius,
													 obliqueCylinderParams.height,
													 obliqueCylinderParams.top_skew_x,
													 obliqueCylinderParams.top_skew_z);
	trapezoidGeo = new TrapezoidGeometry(10, 10, 20, 20, 0, 0, 40, 40, 50);
	beamGeo = generateBeam("i-beam", beamParams.width, beamParams.h, beamParams.s, beamParams.t, beamParams.b);
	
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
	initObliqueCylinderGui();
	initTrapezoidGui();
	initBeamGui();
	initGroundGui();  // Not added to list of folders so it is always visible
	folders = [boxFolder, sphereFolder, obliqueCylinderFolder, trapezoidFolder, beamFolder, coordsFolder, typeFolder, materialFolder];
	folders.forEach(folder => folder.hide()); // Initially hide all folders, then show only the ones we want when required

}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}


function onPointerMove( event ) {
	if (currentVoxel > 0){
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
			}
		} else {
			if (currentVoxel > 0){
				// create new object
				const voxel = new THREE.Mesh(currentGeometry, materials[currentGeometry.type]);
				voxel.position.copy( intersect.point ).add( intersect.face.normal );
				voxel.position.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
				// We need to know the current angle so that when we change the object's angle we don't
				// have a cumulative effect of rotations for each rotation we make.
				voxel.currentAngleX = 0;
				voxel.currentAngleY = 0;
				voxel.currentAngleZ = 0;
				voxel.contextual_type = "other";
				voxel.material_type = undefined;
				scene.add( voxel );
				objects.push( voxel );
				currentObject = voxel;
			} else {
				// select existing object to edit
				currentObject = intersect.object;
			}
			folders.forEach(folder => folder.hide());
			const geometryType = currentObject.geometry.type;
			if (geometryType == "BoxGeometry"){
				boxFolder.children[0].setValue(currentObject.geometry.parameters.width);
				boxFolder.children[1].setValue(currentObject.geometry.parameters.height);
				boxFolder.children[2].setValue(currentObject.geometry.parameters.depth);
				currentFolder = boxFolder;
			} else if (geometryType == "SphereGeometry"){
				sphereFolder.children[0].setValue(currentObject.geometry.parameters.radius);
				currentFolder = sphereFolder;
			} else if (geometryType == "ObliqueCylinderGeometry"){
				obliqueCylinderFolder.children[0].setValue(currentObject.geometry.parameters.radiusTop);
				obliqueCylinderFolder.children[1].setValue(currentObject.geometry.parameters.radiusBottom);
				obliqueCylinderFolder.children[2].setValue(currentObject.geometry.parameters.height);
				obliqueCylinderFolder.children[3].setValue(currentObject.geometry.parameters.topSkewX);
				obliqueCylinderFolder.children[4].setValue(currentObject.geometry.parameters.topSkewZ);
				currentFolder = obliqueCylinderFolder;
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
			} else if (geometryType == "BeamGeometry"){
				beamFolder.children[0].setValue(currentObject.geometry.parameters["width"]);
				beamFolder.children[1].setValue(currentObject.geometry.parameters["h"]);
				beamFolder.children[2].setValue(currentObject.geometry.parameters["s"]);
				beamFolder.children[3].setValue(currentObject.geometry.parameters["t"]);
				beamFolder.children[4].setValue(currentObject.geometry.parameters["b"]);
				currentFolder = beamFolder;
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
				typeFolder.children[0].setValue(currentObject.contextual_type);
				materialFolder.children[0].setValue(currentObject.material_type);
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
		currentVoxel = 0;
		rollOverMesh.visible = false;
	} else {
		currentId = this.id;
		currentVoxel = parseInt( this.value );
		rollOverMesh.geometry.dispose()
		if (currentId == "cube"){
			rollOverMesh.geometry = rollOverCubeGeo;
			currentGeometry = cubeGeo;
			currentFolder = boxFolder;
		} else if (currentId == "sphere"){
			rollOverMesh.geometry = rollOverSphereGeo;
			currentGeometry = sphereGeo;
			currentFolder = sphereFolder;
		} else if (currentId == "obliqueCylinder"){
			rollOverMesh.geometry = rollOverObliqueCylinderGeo;
			currentGeometry = obliqueCylinderGeo;
			currentFolder = obliqueCylinderFolder;
		} else if (currentId == "trapezoid"){
			rollOverMesh.geometry = rollOverTrapezoidGeo;
			currentGeometry = trapezoidGeo;
			currentFolder = trapezoidFolder;
		} else if (currentId == "ibeam"){
			rollOverMesh.geometry = rollOverBeamGeo;
			currentGeometry = beamGeo;
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
	currentObject.contextual_type = context.Type;
}


function updateMaterial(){
	currentObject.material_type = material.Type;
}


function initBoxGui(){
	boxFolder = elementFolder.addFolder('Geometry');
	boxFolder.add(boxParams, 'width').onChange(value => updateParameters("width", value));
	boxFolder.add(boxParams, 'height').onChange(value => updateParameters("height", value));
	boxFolder.add(boxParams, 'depth').onChange(value => updateParameters("depth", value));
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
	sphereFolder = elementFolder.addFolder('Geometry');
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


function initObliqueCylinderGui(){
	obliqueCylinderFolder = elementFolder.addFolder('Geometry');
	obliqueCylinderFolder.add(obliqueCylinderParams, 'top_radius').onChange(value => updateParameters("radiusTop", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'bottom_radius').onChange(value => updateParameters("radiusBottom", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'height').onChange(value => updateParameters("height", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'top_skew_x').onChange(value => updateParameters("topSkewX", value));
	obliqueCylinderFolder.add(obliqueCylinderParams, 'top_skew_z').onChange(value => updateParameters("topSkewZ", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
						new ObliqueCylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.height,
							                        newParams.topSkewX, newParams.topSkewZ));
			if (changedParam == "height"){
				posParams.y = 0;
				moveGeometryY();
			}
		}
	}
}


function initTrapezoidGui(){
	trapezoidFolder = elementFolder.addFolder('Geometry');
	trapezoidFolder.add(trapezoidParams, "leftTransY").onChange(value => updateParameters("leftTransY", value));
	trapezoidFolder.add(trapezoidParams, "leftTransZ").onChange(value => updateParameters("leftTransZ", value));
	trapezoidFolder.add(trapezoidParams, "leftDimensY").onChange(value => updateParameters("leftDimensY", value));
	trapezoidFolder.add(trapezoidParams, "leftDimensZ").onChange(value => updateParameters("leftDimensZ", value));
	trapezoidFolder.add(trapezoidParams, "rightTransY").onChange(value => updateParameters("rightTransY", value));
	trapezoidFolder.add(trapezoidParams, "rightTransZ").onChange(value => updateParameters("rightTransZ", value));
	trapezoidFolder.add(trapezoidParams, "rightDimensY").onChange(value => updateParameters("rightDimensY", value));
	trapezoidFolder.add(trapezoidParams, "rightDimensZ").onChange(value => updateParameters("rightDimensZ", value));
	trapezoidFolder.add(trapezoidParams, "width").onChange(value => updateParameters("width", value));
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
	beamFolder = elementFolder.addFolder('Geometry');
	beamFolder.add(beamParams, "width").onChange(value => updateParameters("width", value));
	beamFolder.add(beamParams, "h").onChange(value => updateParameters("h", value));
	beamFolder.add(beamParams, "s").onChange(value => updateParameters("s", value));
	beamFolder.add(beamParams, "t").onChange(value => updateParameters("t", value));
	beamFolder.add(beamParams, "b").onChange(value => updateParameters("b", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			const newGeom = generateBeam("i-beam", newParams.width, newParams.h, newParams.s, newParams.t, newParams.b, posParams.x, posParams.y, posParams.z);
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
