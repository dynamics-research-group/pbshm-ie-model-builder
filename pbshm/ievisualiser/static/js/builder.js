import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'; 

import * as gui from './guiHelper.js';
import { plotElements } from './viewer.js';
import {ObliqueCylinderGeometry} from './obliqueCylinder.js';
import {TrapezoidGeometry} from './trapezoid.js'
import {generateBeam} from './geometryHelper.js';
import {jsonToGl} from './translationHelper.js';
import { save } from './jsonHelper.js';
import * as colours from './colourHelper.js';


const canvas = document.querySelector('#c');
let camera, scene, renderer, controls;
let floor;
let pointer, raycaster, isShiftDown = false, isCtrlDown = false;
let relationships = {};
let relationshipNatures = {};
let selectedObjects = []; // Selecting objects for relationships
let floorFolder;
let nextID = 0;  // for automatically assigning unique names when creating objects

const floorParams = {'width': 300,
					'depth': 300};
const groundRadius = 3;

let rollOverMesh;
const rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
const rollOverCubeGeo = new THREE.BoxGeometry(gui.boxParams.length, gui.boxParams.height, gui.boxParams.width);
const rollOverSphereGeo = new THREE.SphereGeometry(gui.sphereParams.radius);
const rollOverCylinderGeo = new THREE.CylinderGeometry(gui.cylinderParams.radius, gui.cylinderParams.radius, gui.cylinderParams.length);
const rollOverObliqueCylinderGeo = new ObliqueCylinderGeometry(gui.obliqueCylinderParams['Faces left radius'],
															gui.obliqueCylinderParams['Faces left radius'],
															gui.obliqueCylinderParams.length,
															gui.obliqueCylinderParams['Faces Right Trans. y']  - gui.obliqueCylinderParams['Faces Left Trans. y'] ,
															-(gui.obliqueCylinderParams['Faces Right Trans. z']  - gui.obliqueCylinderParams['Faces Left Trans. z']));
const rollOverTrapezoidGeo = new TrapezoidGeometry(gui.trapezoidParams['Faces Left Trans. y'], gui.trapezoidParams['Faces Left Trans. z'],
												gui.trapezoidParams['Faces Left Height'], gui.trapezoidParams['Faces Left Width'],
												gui.trapezoidParams['Faces Right Trans. y'], gui.trapezoidParams['Faces Right Trans. z'],
												gui.trapezoidParams['Faces Right Height'], gui.trapezoidParams['Faces Right Width'],
												gui.trapezoidParams.length);
const rollOverIBeamGeo = generateBeam("i-beam", gui.beamParams.length, gui.beamParams.h, gui.beamParams.s, gui.beamParams.t, gui.beamParams.b);
const rollOverCBeamGeo = generateBeam("c-beam", gui.beamParams.length, gui.beamParams.h, gui.beamParams.s, gui.beamParams.t, gui.beamParams.b);
const rollOverGroundGeo = new THREE.SphereGeometry(groundRadius);
rollOverCylinderGeo.rotateZ(Math.PI/2);
rollOverObliqueCylinderGeo.rotateZ(Math.PI/2);
let planeGeometry;

let currentId;  // name of the new geometry object to be added
let currentGeometry;
let currentObject;  // specific existing object to be edited
const objects = [];  // list of all objects in the scene


function setupGui(saveUrl){
	colours.addColourFolders(gui.coloursFolder, render, "builder");

	gui.modelDetailsFolder.children[gui.modelIdx.type].onChange( value => {
                                                                gui.modelDetails['Type'] = value;
                                                                if (value == 'grounded') {
                                                                    document.getElementById("uigroundinfo").style.visibility = 'visible';
                                                                    document.getElementById("uiground").style.visibility = 'visible';
                                                                } else {
                                                                    document.getElementById("uigroundinfo").style.visibility = 'hidden';
                                                                    document.getElementById("uiground").style.visibility = 'hidden';
                                                                } });
	gui.relationFolder.children[gui.relIdx.showOrphans].onChange(value => toggleHighlightUnrelated(value));  // 'Show orphans'
	gui.relationFolder.children[gui.relIdx.hideConn].onChange(value => toggleHideConnected(value));  // 'Hide connected'
	gui.relationFolder.children[gui.relIdx.freeTypes].onChange( value => updateRelationship(value));
	gui.relationFolder.children[gui.relIdx.connTypes].onChange( value => updateRelationship(value));
	gui.relationFolder.children[gui.relIdx.groundTypes].onChange( value => updateRelationship(value));
	gui.relationFolder.children[gui.relIdx.natures].onChange( value => updateRelationshipNature(value));
	
	gui.elementFolder.children[gui.eleIdx.name].onChange(updateElementName);

	gui.transFolder.children[gui.transIdx.x].onChange(moveGeometryX);
	gui.transFolder.children[gui.transIdx.y].onChange(moveGeometryY);
	gui.transFolder.children[gui.transIdx.z].onChange(moveGeometryZ);

	gui.rotFolder.children[gui.rotIdx.x].onChange(rotateGeometryX);
	gui.rotFolder.children[gui.rotIdx.y].onChange(rotateGeometryY);
	gui.rotFolder.children[gui.rotIdx.z].onChange(rotateGeometryZ);

	gui.materialFolder.children[gui.matIdx.type].onChange(updateMaterial);
	gui.contextualFolder.children[gui.conIdx.type].onChange(updateContext);
	for (let i=0; i<gui.geometryKeys.length; i++){
    	gui.geometryFolder.children[i].onChange(updateJsonGeometry);
	}

	initBoxGui()
	initSphereGui();
	initCylinderGui();
	initObliqueCylinderGui();
	initTrapezoidGui();
	initBeamGui();
	initGroundGui();  // Not added to list of folders so it is always visible

	const saver = {'Save': function() {save(saveUrl, gui.modelDetails, relationships, relationshipNatures, colours.cElements);}};
	gui.gui.add(saver, 'Save');

}

function loadBlankBuilder(){
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( floorParams.width/2, 100, 300 );
	camera.lookAt(floorParams.width/2, 0, -floorParams.depth/2);  // where the camera looks
	
	// Give the user the ability to control the camera
	controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(floorParams.width/2, 0, -floorParams.depth/2);	// the centre when spinning the environmnet
	// Only render when the user moves the camera
	controls.addEventListener("change", () => renderer.render(scene, camera));
	controls.update();

	// Draw the floor
	planeGeometry = new THREE.PlaneGeometry(floorParams.width, floorParams.depth );
	planeGeometry.rotateX( - Math.PI / 2 );
	floor = new THREE.Mesh( planeGeometry, new THREE.MeshBasicMaterial( { visible: true } ) );
	floor.position.set(floorParams.width/2, 0, -floorParams.depth/2)
	floor.name = "plane";
	scene.add( floor );
	objects.push( floor );

	// Lights
	const ambientLight = new THREE.AmbientLight( 0x606060, 3 );
	scene.add( ambientLight );

	const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
	directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
	scene.add( directionalLight );

}


function buildModel(saveUrl, shapes=undefined, preRelationships=undefined, preNatures=undefined) {
	setupGui(saveUrl);
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );
	
	renderer = new THREE.WebGLRenderer( { antialias: true }, canvas );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	
	let info;
	if (shapes == undefined) {
		loadBlankBuilder();
	} else {
		info = plotElements(renderer.domElement, scene, shapes);
		camera = info.camera
		const elementDict = {}  // to help track relationships
		for (let e of info.elements) {
			objects.push(e)
			e.currentAngleX = 0;
			e.currentAngleY = 0;
			e.currentAngleZ = 0;
			if (e.el_contextual != "ground") {
				colours.makeContextColourVisible(e.el_contextual);
				colours.makeMaterialColourVisible(e.el_material);
				colours.makeGeometryColourVisible(e.el_geometry);
			}
			e.relationshipCount = 0;
			elementDict[e.name] = e;  // relationships are referred to by name in json
			nextID++;
		}
		colours.resetColours(gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue());  // Set the colours to match the colourScheme chosen in the GUI
		controls = info.controls;
		floor = info.floor;
		floorParams.width = floor.geometry.parameters.width;
		floorParams.depth = floor.geometry.parameters.height;
		objects.push(floor);

		for (const [key, value] of Object.entries(preRelationships)){
			const relatedEls = key.split(',');
			let relationshipGroup = [];
			for (let i=0; i<relatedEls.length; i++) {
				elementDict[relatedEls[i]].relationshipCount++;
				relationshipGroup.push(elementDict[relatedEls[i]].id);
			}
			relationships[relationshipGroup] = value;
			if (value == 'joint' || value == 'connection') {
				relationshipNatures[relationshipGroup] = preNatures[key];
			}
		}
	}
	
	// Only render when the user moves the camera
	controls.addEventListener("change", () => renderer.render(scene, camera));
	controls.update();

	
	// Roll-over helpers
	rollOverMesh = new THREE.Mesh(rollOverIBeamGeo, rollOverMaterial);
	rollOverMesh.visible = false;
	scene.add( rollOverMesh );

	// To detect where the user has clicked
	raycaster = new THREE.Raycaster();
	pointer = new THREE.Vector2();


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
	document.querySelectorAll( '#uiground .tiles input[type=radio][name=voxel]' ).forEach( ( elem ) => {
		elem.addEventListener( 'click', allowUncheck );
	} );

	window.addEventListener( 'resize', onWindowResize );

	
	
	gui.hideGeometryFolders; // Initially hide all folders, then show only the ones we want when required
	render();
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
			rollOverMesh.position.copy( intersect.point );
			rollOverMesh.geometry.computeBoundingBox();
			const rollOverHeight = (rollOverMesh.geometry.boundingBox.max.y - rollOverMesh.geometry.boundingBox.min.y) / 2
			rollOverMesh.position.addScalar(rollOverHeight);
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
			if ( intersect.object !== floor ) {
				scene.remove( intersect.object );
				objects.splice( objects.indexOf( intersect.object ), 1 );
				colours.cElements.splice( colours.cElements.indexOf( intersect.object ), 1 );
			}
			// delete any relationships involving this object
			for (let key of Object.keys(relationships)){
				key = key.split(',');
				if ( key.indexOf(String(intersect.object.id)) >=0 ){
					delete relationships[key];
				}
			}
			for (let key of Object.keys(relationshipNatures)){
				key = key.split(',');
				if ( key.indexOf(String(intersect.object.id)) >=0 ){
					delete relationshipNatures[key];
				}
			}
		} else if ( isCtrlDown ) {
			// select object
			gui.elementFolder.hide();
			if ( intersect.object !== floor ) {
				const selectedIndex = selectedObjects.indexOf(intersect.object);
				if (selectedIndex >= 0){
					// If it was already selected, deselect it
					colours.resetColour(gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue(), intersect.object);
					gui.relationFolder.children[gui.relIdx.freeTypes].hide();
					gui.relationFolder.children[gui.relIdx.connTypes].hide();
					gui.relationFolder.children[gui.relIdx.groundTypes].hide();
					// Shift everything down to fill the gap of the deselected object
					for (let i=selectedIndex; i<selectedObjects.length-1; i++){
						selectedObjects[i] = selectedObjects[i+1];
					}
					selectedObjects.pop();
				} else {
					// Select the object
					intersect.object.material.color.setHex(colours.otherColours['Selected element']);
					selectedObjects.push(intersect.object);
				}
				if (selectedObjects.length >= 2) {
					// Can't have more than two elements selected where one is ground
					if (selectedObjects.length > 2){
						for (let i=0; i<selectedObjects.length; i++){
							if (selectedObjects[i].el_contextual == "ground"){
								gui.relationFolder.children[gui.relIdx.freeTypes].hide();
								gui.relationFolder.children[gui.relIdx.connTypes].hide();
								gui.relationFolder.children[gui.relIdx.groundTypes].hide();
								gui.relationFolder.children[gui.relIdx.natures].hide();
								return;
							}
						}
					}
					// Show the existing relationship they have //TODO: change, don't event need to pass anything
					const currentRelat = currentRelationship();
					gui.relationFolder.show();
					if (selectedObjects.length == 2 && (selectedObjects[0].el_contextual == "ground" || selectedObjects[1].el_contextual == "ground")){
							gui.relationFolder.children[gui.relIdx.freeTypes].hide();  // hide 'free' relationships folder
							gui.relationFolder.children[gui.relIdx.connTypes].hide();  // hide 'connection' relationships folder
							gui.relationFolder.children[gui.relIdx.groundTypes].show();  // show 'grounded' relationships folder
							gui.relationFolder.children[gui.relIdx.groundTypes].setValue(currentRelat);
							gui.relationFolder.children[gui.relIdx.natures].hide();  // hide natures
					} else if (selectedObjects.length == 2) {
						gui.relationFolder.children[gui.relIdx.freeTypes].show();  // show 'free'
						gui.relationFolder.children[gui.relIdx.freeTypes].setValue(currentRelat);
						gui.relationFolder.children[gui.relIdx.connTypes].hide();  // hide 'connection'
						gui.relationFolder.children[gui.relIdx.groundTypes].hide();  // hide 'grounded'
						if (currentRelat == 'joint' || currentRelat == 'connection') {
							gui.relationFolder.children[gui.relIdx.natures].show();  // show natures
							gui.relationFolder.children[gui.relIdx.natures].setValue(currentRelationshipNature());
						} else {
							gui.relationFolder.children[gui.relIdx.natures].hide();  // hide natures
						}
					} else if (selectedObjects.length > 2) {
						gui.relationFolder.children[gui.relIdx.freeTypes].hide();  // hide 'free'
						gui.relationFolder.children[gui.relIdx.connTypes].show();  // show 'connection'
						gui.relationFolder.children[gui.relIdx.connTypes].setValue(currentRelat);
						gui.relationFolder.children[gui.relIdx.groundTypes].hide();  // hide 'grounded'
						if (currentRelat == 'connection') {
							gui.relationFolder.children[gui.relIdx.natures].show();  // show natures
							gui.relationFolder.children[gui.relIdx.natures].setValue(currentRelationshipNature());
						} else {
							gui.relationFolder.children[gui.relIdx.natures].hide();  // hide natures
						}
					}
				}
			}
		} else {
			if (currentId != undefined){
				// Add new object
				if (currentId == "cube"){
					currentGeometry = new THREE.BoxGeometry(gui.boxParams.length, gui.boxParams.height, gui.boxParams.width);
					currentGeometry.parameters['thickness'] = gui.boxParams.thickness;
				} else if (currentId == "sphere"){
					currentGeometry = new THREE.SphereGeometry(gui.sphereParams.radius);
					currentGeometry.parameters['thickness'] = gui.sphereParams.thickness;
				} else if (currentId == "cylinder"){
					currentGeometry = new THREE.CylinderGeometry(gui.cylinderParams.radius, gui.cylinderParams.radius, gui.cylinderParams.length);
					// Rotate because cylinder is assumed horizontal in json but vertical in webGL
					currentGeometry.rotateZ(Math.PI/2);
					currentGeometry.parameters['thickness'] = gui.cylinderParams.thickness;
				} else if (currentId == "obliqueCylinder"){
					currentGeometry = new ObliqueCylinderGeometry(gui.obliqueCylinderParams['Faces left radius'],
						gui.obliqueCylinderParams['Faces right radius'],
						gui.obliqueCylinderParams.length,
						gui.obliqueCylinderParams['Faces Right Trans. y']  - gui.obliqueCylinderParams['Faces Left Trans. y'] ,
						-(gui.obliqueCylinderParams['Faces Right Trans. z']  - gui.obliqueCylinderParams['Faces Left Trans. z']));
					currentGeometry.parameters['Faces Left Trans. y'] = gui.obliqueCylinderParams['Faces Left Trans. y']
					currentGeometry.parameters['Faces Left Trans. z'] = gui.obliqueCylinderParams['Faces Left Trans. z']
					currentGeometry.parameters['Faces Right Trans. y'] = gui.obliqueCylinderParams['Faces Right Trans. y']
					currentGeometry.parameters['Faces Right Trans. z'] = gui.obliqueCylinderParams['Faces Right Trans. z']
					currentGeometry.parameters['thickness'] = gui.obliqueCylinderParams.thickness;
					// Rotate because cylinder is assumed horizontal in json but vertical in webGL
					currentGeometry.rotateZ(Math.PI/2);
				} else if (currentId == "trapezoid"){
					currentGeometry = new TrapezoidGeometry(gui.trapezoidParams['Faces Left Trans. y'], gui.trapezoidParams['Faces Left Trans. z'],
															gui.trapezoidParams['Faces Left Height'], gui.trapezoidParams['Faces Left Width'],
															gui.trapezoidParams['Faces Right Trans. y'], gui.trapezoidParams['Faces Right Trans. z'],
															gui.trapezoidParams['Faces Right Height'], gui.trapezoidParams['Faces Right Width'],
															gui.trapezoidParams.length);
					currentGeometry.parameters['thickness'] = gui.trapezoidParams.thickness;
				} else if (currentId == "ibeam"){
					currentGeometry = generateBeam("i-beam", gui.beamParams.length, gui.beamParams.h, gui.beamParams.s, gui.beamParams.t, gui.beamParams.b);
					currentGeometry.parameters['thickness'] = gui.beamParams.thickness;
				} else if (currentId == "cbeam"){
					currentGeometry = generateBeam("c-beam", gui.beamParams.length, gui.beamParams.h, gui.beamParams.s, gui.beamParams.t, gui.beamParams.b);
					currentGeometry.parameters['thickness'] = gui.beamParams.thickness;
				} else if (currentId == "ground") {
					currentGeometry = new THREE.SphereGeometry(groundRadius);
					currentGeometry.type = "ground";
				}

				// create new object
				const voxel = new THREE.Mesh(currentGeometry, new THREE.MeshLambertMaterial({color: colours.builderColours[currentGeometry.type]}));
				voxel.position.copy(intersect.point);
				// Find the size of the geometry in the y-axis and raise it so it's not half-way through the floor
				voxel.geometry.computeBoundingBox()
				voxel.position.addScalar((voxel.geometry.boundingBox.max.y - voxel.geometry.boundingBox.min.y)/2);
				voxel.position.multiplyScalar(100).round().multiplyScalar(0.01);  // round to 2d.p.
				// We need to know the current angle so that when we change the object's angle we don't
				// have a cumulative effect of rotations for each rotation we make.
				voxel.currentAngleX = 0;
				voxel.currentAngleY = 0;
				voxel.currentAngleZ = 0;
				if (currentId == "ground") {
					voxel.el_contextual = "ground";
				} else {
					voxel.el_contextual = undefined;
				}
				voxel.el_material = undefined;
				voxel.relationshipCount = 0;
				voxel.name = 'element' + (nextID++);
				scene.add( voxel );
				objects.push( voxel );
				currentObject = voxel;
				colours.cElements.push(voxel);
			} else {
				// select existing object to edit unless it's the floor
				if (intersect.object.name != "plane") {
					currentObject = intersect.object;
				}
			}
			gui.setGeometryFolder(currentObject);
		}
	}
	render();
}


function onDocumentKeyDown( event ) {
	switch ( event.keyCode ) {
		case 16: isShiftDown = true; break;
		case 17: isCtrlDown = true; break;
		// case 37:  // left
		// 	break;
		// case 38:  // up
		// 	break;
		// case 39:  // right
		// 	break;
		// case 40:  // down
		// 	break;
		// case 83:  // s
		// 	break;
		// case 87:  // w
		// 	break;
	}
	render();
}


function onDocumentKeyUp( event ) {
	switch ( event.keyCode ) {
		case 16: isShiftDown = false; break;
		case 17: isCtrlDown = false; break;
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
			gui.setCurrentFolder(gui.boxFolder);
		} else if (currentId == "sphere"){
			rollOverMesh.geometry = rollOverSphereGeo;
			gui.setCurrentFolder(gui.sphereFolder);
		} else if (currentId == "cylinder"){
			rollOverMesh.geometry = rollOverCylinderGeo;
			gui.setCurrentFolder(gui.cylinderFolder);	
		} else if (currentId == "obliqueCylinder"){
			rollOverMesh.geometry = rollOverObliqueCylinderGeo;
			gui.setCurrentFolder(gui.obliqueCylinderFolder);
		} else if (currentId == "trapezoid"){
			rollOverMesh.geometry = rollOverTrapezoidGeo;
			gui.setCurrentFolder(gui.trapezoidFolder);
		} else if (currentId == "ibeam"){
			rollOverMesh.geometry = rollOverIBeamGeo;
			gui.setCurrentFolder(gui.beamFolder);
		} else if (currentId == "cbeam"){
			rollOverMesh.geometry = rollOverCBeamGeo;
			gui.setCurrentFolder(gui.beamFolder);
		} else if (currentId == "ground"){
			rollOverMesh.geometry = rollOverGroundGeo;
			gui.setCurrentFolder(undefined);
		}
		rollOverMesh.visible = true;
	}
	gui.hideGeometryFolders;
	
}

function updateGeometry(mesh, geometry){
	mesh.geometry.dispose();
	mesh.geometry = geometry;
	render();
}


function initGroundGui(){
	floorFolder = gui.gui.addFolder('Ground dimensions (visual only)');
	floorFolder.add(floorParams, 'width').onChange(generateGeometry);
	floorFolder.add(floorParams, 'depth').onChange(generateGeometry);

	function generateGeometry(){
		planeGeometry = new THREE.PlaneGeometry( floorParams.width, floorParams.depth );
		planeGeometry.rotateX( - Math.PI / 2 );
		updateGeometry(floor, planeGeometry);
		// Ensure the camera and controls are still centred on the floor,
		// and that the front left corner is at (0, 0, 0).
		camera.lookAt(floorParams.width/2, 0, -floorParams.depth/2);
		controls.target.set(floorParams.width/2, 0, -floorParams.depth/2);
		floor.position.set(floorParams.width/2, 0, -floorParams.depth/2)
		render();
	}
}


function updateElementName(){
	currentObject.name = gui.elInfo.Name;
}



// It's necessary to handle each dimension separately,
// otherwise the object's position attributes can get overwritten by whatever old values
// are in the gui before the gui has been updated to show the parameters.
// of the object that has just been selected.
function moveGeometryX(){
	currentObject.position.x = jsonToGl(currentObject, "x", gui.posParams.x);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function moveGeometryY(){
	currentObject.position.y = jsonToGl(currentObject, "y", gui.posParams.y);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function moveGeometryZ(){
	currentObject.position.z = jsonToGl(currentObject, "z", gui.posParams.z);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function moveGeometryXYZ(pos){
	currentObject.position.x = jsonToGl(currentObject, "x", gui.posParams.x);
	currentObject.position.y = jsonToGl(currentObject, "y", gui.posParams.y);
	currentObject.position.z = jsonToGl(currentObject, "z", gui.posParams.z);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}


function rotateGeometryX(){
	const newAngle = gui.rotateParams.x * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleX;
	currentObject.rotateX(rotation);
	currentObject.currentAngleX = newAngle;
	moveGeometryXYZ();  // Ensure the front left corner is still in the correct location
	render();
}


function rotateGeometryY(){
	const newAngle = gui.rotateParams.y * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleY;
	currentObject.rotateY(rotation);
	currentObject.currentAngleY = newAngle;
	moveGeometryXYZ();  // Ensure the front left corner is still in the correct location
	render();
}


function rotateGeometryZ(){
	const newAngle = gui.rotateParams.z * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleZ;
	currentObject.rotateZ(rotation);
	currentObject.currentAngleZ = newAngle;
	moveGeometryXYZ();  // Ensure the front left corner is still in the correct location
	render();
}


function updateContext(){
	currentObject.el_contextual = gui.context.Type;
	colours.makeContextColourVisible(gui.context.Type);
	if (gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue() == "contextual"
			&& currentObject.material.color.getHex() != colours.otherColours['Orphans']
			&& currentObject.material.color.getHex() != colours.otherColours['Selected element']) {
		currentObject.material.color.setHex(colours.contextualColours[currentObject.el_contextual]);
	}
	render();
}


function updateMaterial(){
	currentObject.el_material = gui.material.Type;
	colours.makeMaterialColourVisible(gui.material.Type);
	if (gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue() == "material"
			&& currentObject.material.color.getHex() != colours.otherColours['Orphans']
			&& currentObject.material.color.getHex() != colours.otherColours['Selected element']) {
		currentObject.material.color.setHex(colours.materialColours[currentObject.el_material]);
	}
	render();
}


function updateJsonGeometry(){
	currentObject.el_geometry = gui.geometry.Type;
	colours.makeGeometryColourVisible(gui.geometry.Type);
	if (gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue() == "geometry"
			&& currentObject.material.color.getHex() != colours.otherColours['Orphans']
			&& currentObject.material.color.getHex() != colours.otherColours['Selected element']) {
		currentObject.material.color.setHex(colours.geometryColours[currentObject.el_geometry]);
	}
	if (gui.geometry.Type != undefined && gui.geometry.Type.substring(0, 5) == "shell"){
		// Show the thickness parameter within the (last child of the) geometry folder
		gui.currentFolder.children[gui.currentFolder.children.length-1].show();
	} else {
		const lastFolderItem =  gui.currentFolder.children[gui.currentFolder.children.length-1]
		if (lastFolderItem.property == "thickness"){
			gui.currentFolder.children[gui.currentFolder.children.length-1].hide();
		}
	}
	render();
}



function updateThickness(value){
	currentObject.geometry.parameters['thickness'] = value;
}


function initBoxGui(){
	gui.boxFolder.children[gui.boxIdx.length].onChange(value => updateParameters("width", value));
	gui.boxFolder.children[gui.boxIdx.height].onChange(value => updateParameters("height", value));
	gui.boxFolder.children[gui.boxIdx.width].onChange(value => updateParameters("depth", value));
	gui.boxFolder.children[gui.boxIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const pos = {...gui.posParams};  // threejs makes the centre of the object stay in the same place but we want the corner to stay the same instead
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
						new THREE.BoxGeometry(newParams.width, newParams.height, newParams.depth));
			moveGeometryXYZ(pos);  // move the object back into its correct corner location
		}
	}
}
  

function initSphereGui(){
	gui.sphereFolder.children[gui.sphIdx.radius].onChange(updateParameters);
	gui.sphereFolder.children[gui.sphIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(){
		if (currentObject.geometry.parameters.radius != gui.sphereParams.radius) {
			const pos = {...gui.posParams};
			updateGeometry(currentObject, new THREE.SphereGeometry(gui.sphereParams.radius));
			moveGeometryXYZ(pos);
		}
	}
}


function initCylinderGui(){
	gui.cylinderFolder.children[gui.cylIdx.radius].onChange(value => updateParameters("radiusTop", value));
	gui.cylinderFolder.children[gui.cylIdx.length].onChange(value => updateParameters("height", value));
	gui.cylinderFolder.children[gui.cylIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const pos = {...gui.posParams};
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			if (changedParam == "radiusTop"){
				newParams["radiusBottom"] = value;  // they must be the same
			}
			updateGeometry(currentObject,
						new THREE.CylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.height));
			currentObject.geometry.rotateZ(Math.PI/2);
			render();
			moveGeometryXYZ(pos);
		}
	}
}


function initObliqueCylinderGui(){
	gui.obliqueCylinderFolder.children[gui.oblIdx.leftRadius].onChange(value => updateParameters("radiusTop", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.rightRadius].onChange(value => updateParameters("radiusBottom", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.length].onChange(value => updateParameters("height", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.leftTransY].onChange(value => updateParameters("leftTransY", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.leftTransZ].onChange(value => updateParameters("leftTransZ", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.rightTransY].onChange(value => updateParameters("rightTransY", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.rightTransZ].onChange(value => updateParameters("rightTransZ", value));
	gui.obliqueCylinderFolder.children[gui.oblIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(changedParam, value){
		if (changedParam == "leftTransY" || changedParam == "rightTransY"){
			changedParam = "topSkewX";
			value = gui.obliqueCylinderParams['Faces Right Trans. y']  - gui.obliqueCylinderParams['Faces Left Trans. y'];
		} else if (changedParam == "leftTransZ" || changedParam == "rightTransZ"){
			changedParam = "topSkewZ";
			value = -(gui.obliqueCylinderParams['Faces Right Trans. z']  - gui.obliqueCylinderParams['Faces Left Trans. z']);
		}
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const pos = {...gui.posParams};
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
						new ObliqueCylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.height,
							                        newParams.topSkewX, newParams.topSkewZ));
			currentObject.geometry.rotateZ(Math.PI/2);
			currentObject.geometry.parameters['Faces Left Trans. y'] = gui.obliqueCylinderParams['Faces Left Trans. y']
			currentObject.geometry.parameters['Faces Left Trans. z'] = gui.obliqueCylinderParams['Faces Left Trans. z']
			currentObject.geometry.parameters['Faces Right Trans. y'] = gui.obliqueCylinderParams['Faces Right Trans. y']
			currentObject.geometry.parameters['Faces Right Trans. z'] = gui.obliqueCylinderParams['Faces Right Trans. z']
			render();
			moveGeometryXYZ(pos);
		}
	}
}




function initTrapezoidGui(){
	gui.trapezoidFolder.children[gui.trapIdx.leftTransY].onChange(value => updateParameters("leftTransY", value));
	gui.trapezoidFolder.children[gui.trapIdx.leftTransZ].onChange(value => updateParameters("leftTransZ", value));
	gui.trapezoidFolder.children[gui.trapIdx.leftHeight].onChange(value => updateParameters("leftDimensY", value));
	gui.trapezoidFolder.children[gui.trapIdx.leftWidth].onChange(value => updateParameters("leftDimensZ", value));
	gui.trapezoidFolder.children[gui.trapIdx.rightTransY].onChange(value => updateParameters("rightTransY", value));
	gui.trapezoidFolder.children[gui.trapIdx.rightTransZ].onChange(value => updateParameters("rightTransZ", value));
	gui.trapezoidFolder.children[gui.trapIdx.rightHeight].onChange(value => updateParameters("rightDimensY", value));
	gui.trapezoidFolder.children[gui.trapIdx.rightWidth].onChange(value => updateParameters("rightDimensZ", value));
	gui.trapezoidFolder.children[gui.trapIdx.length].onChange(value => updateParameters("width", value));
	gui.trapezoidFolder.children[gui.trapIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const pos = {...gui.posParams};
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
				new TrapezoidGeometry(newParams.leftTransY, newParams.leftTransZ, newParams.leftDimensY, newParams.leftDimensZ,
									newParams.rightTransY, newParams.rightTransZ, newParams.rightDimensY, newParams.rightDimensZ,
									newParams.width));
			moveGeometryXYZ(pos);
		}
	}
}


function initBeamGui(){
	gui.beamFolder.children[gui.beamIdx.length].onChange(value => updateParameters("width", value));
	gui.beamFolder.children[gui.beamIdx.h].onChange(value => updateParameters("h", value));
	gui.beamFolder.children[gui.beamIdx.s].onChange(value => updateParameters("s", value));
	gui.beamFolder.children[gui.beamIdx.t].onChange(value => updateParameters("t", value));
	gui.beamFolder.children[gui.beamIdx.b].onChange(value => updateParameters("b", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const pos = {...gui.posParams};
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			let newGeom;
			if (currentObject.geometry.type == "IBeamGeometry") {
				newGeom = generateBeam("i-beam", newParams.width, newParams.h, newParams.s, newParams.t, newParams.b, gui.posParams.x, gui.posParams.y, gui.posParams.z);
			} else {
				newGeom = generateBeam("c-beam", newParams.width, newParams.h, newParams.s, newParams.t, newParams.b, gui.posParams.x, gui.posParams.y, gui.posParams.z);
			}
			currentObject.geometry.dispose();
			currentObject.geometry = newGeom;
			moveGeometryXYZ(pos);
			render();
		}
	}
}

/* Functions dealing with relationships between elements.
The elements involved in a relationship are stored in alphabetical order or element id
so we can easily check if a relationship already exists between a set of elements. */

function sortedSelectedIds(){
	let elementIds = [];
	for (let i=0; i<selectedObjects.length; i++){
		elementIds.push(selectedObjects[i].id)
	}
	elementIds.sort();
	return elementIds;
}

function updateRelationship(value){
	// Check if a relationship is already defined
	if (value != 'none') {
		const elementIds = sortedSelectedIds();
		
		if (relationships[elementIds] != undefined) {
			// If they're already paired then update the relationship (or remove it if 'none' has been selected)
			if (value == 'none'){
				delete relationships[elementIds];
				for (let i=0; i<selectedObjects.length; i++){
					selectedObjects[i].relationshipCount--;
				}
			} else {
				relationships[elementIds] = value;
			}
		} else {
			// Add the new relationship
			relationships[elementIds] = value;
			for (let i=0; i<selectedObjects.length; i++){
				selectedObjects[i].relationshipCount++;
			}
		}
		// Show dropdown to select nature of relationship
		if (value == 'joint' || value == 'connection'){
			gui.relationFolder.children[gui.relIdx.natures].show();
			gui.relationFolder.children[gui.relIdx.natures].setValue(currentRelationshipNature());
		} else {
			gui.relationFolder.children[gui.relIdx.natures].hide();
		}
	}
}


function updateRelationshipNature(value){
	const elementIds = sortedSelectedIds();
	// Find out which way round the pair is stored
	relationshipNatures[elementIds] = value;
}


function toggleHighlightUnrelated(value){
	const colourScheme = gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue();
	if (value == true){
		// Deselect selected objects to avoid confusion
		try {
			colours.resetColour(colourScheme, selectedObjects[0]);
			selectedObjects[0] = undefined;
		} catch (TypeError) {;}
		try {
			colours.resetColour(colourScheme, selectedObjects[1]);
			selectedObjects[1] = undefined;
		} catch (TypeError) {;}
		gui.relationFolder.children[gui.relIdx.freeTypes].hide();
		gui.relationFolder.children[gui.relIdx.connTypes].hide();
		gui.relationFolder.children[gui.relIdx.groundTypes].hide();
		gui.relationFolder.children[gui.relIdx.natures].hide();
		
		// Highlight orphaned elements
		for (let el of colours.cElements){
			if (el.relationshipCount == 0){
				el.material.color.setHex(colours.otherColours['Orphans']);
			}
		}
	} else {
		colours.resetColours(colourScheme);
	}
	render();
}


function currentRelationship(){
	const elementIds = sortedSelectedIds();
	if (relationships[elementIds] == undefined){
		return 'none';
	}
	return relationships[elementIds]
}


function currentRelationshipNature(){
	const elementIds = sortedSelectedIds();
	if (relationshipNatures[elementIds] == undefined){
		return 'none';
	}
	return relationshipNatures[elementIds]
}


function toggleHideConnected(value){
	if (value == true){
		for (let el of colours.cElements){
			if (el.relationshipCount > 0){
				el.visible = false;
			}
		}
	} else {
		for (let el of colours.cElements){
			el.visible = true;
		}
	}
	render();
}




function render() {
	renderer.render( scene, camera );
}


export {buildModel};