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


// Variables used for rendering
const canvas = document.querySelector('#c');
let camera, scene, renderer, controls, pointer, raycaster;

let isShiftDown = false;  // to delete an object
let isCtrlDown = false;  // to select an object
let selectedObjects = [];
let relationships = {};  // {[objects]: relationship_type}
let relationshipNatures = {};  // {[objects]: relationship_nature}
let nextID = 0;  // for automatically assigning unique names ('element#nextID') when creating objects

// Variables relating to visualising the floor that the model is built on
let floor;
let floorFolder;
let planeGeometry;
const floorParams = {'width': 300,
					'depth': 300};

const groundRadius = 3;  // radius of the spheres that are used to represent ground elements

// Variables related to showing where an object will be placed when hovering over the floor
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

let currentId;  // the type of geometry selected from the panel in the html file (e.g. 'cube', 'sphere').
let currentObject;  // threejs mesh object that the user has selected
const objects = [];  // list of all objects in the scene, including the floor. This is necessary for checking which object a user has selected.

/**
 * Create all necessary folders in the gui (except for the colour folder which is handled in colourHelper.js)
 * @param {string} saveUrl The URL required for the post request
 */
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
	initGroundGui();

	const saver = {'Save': function() {save(saveUrl, gui.modelDetails, relationships, relationshipNatures, colours.cElements);}};
	gui.gui.add(saver, 'Save');
}


/**
 * Create a threejs environment with just one object representing the floor.
 */
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


/**
 * Create the builder environment into the html canvas labelled 'c'.
 * Pre-loads an existing model if shapes, preRelationships and preNatures are provided.
 * @param {string} saveUrl The URL required for the post request
 * @param {list} shapes Details of each element (provided by jsonHelper.extractShapes) (when loading a model)
 * @param {dict} preRelationships Details of pre-existing relationship types (when loading a model)
 * @param {dict} preNatures Details of pre-existing relationship natures (when loading a model)
 */
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
		const elementDict = {}  // to help with loading relationship info
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
				relationshipGroup.push(elementDict[relatedEls[i]].id);  // relationships are now referred to by id in case of name changes
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

/**
 * Update object rendering on window resize so graphics don't become distorted.
 */
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

/**
 * If a geometry is selected in the builder panel, then move the rollover mesh to the location of the cursor.
 * @param {event} event Event of moving the cursor
 */
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

/**
 * If shift is down, delete the object under the cursor.
 * If ctrl is down, select the object under the cursor.
 * If a geometry is selected in the builder panel, place the object at the cursor location.
 * Otherwise, do nothing.
 * @param {event} event Event of clicking on the screen
 */
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
					// Show the existing relationship they have, or select 'none'
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
				let currentGeometry;
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

/**
 * Note if shift or ctrl are pressed.
 * @param {event} event When a key is pressed
 */
function onDocumentKeyDown( event ) {
	switch ( event.keyCode ) {
		case 16: isShiftDown = true; break;
		case 17: isCtrlDown = true; break;
	}
	render();
}

/**
 * Note if shift or ctrl have been released.
 * @param {event} event When a key is resleased
 */
function onDocumentKeyUp( event ) {
	switch ( event.keyCode ) {
		case 16: isShiftDown = false; break;
		case 17: isCtrlDown = false; break;
	}
}

/**
 * Note which geometry (if any) has been selected from the builder selection panel and show/hide gui folders as appropriate.
 */
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

/**
 * Update the geometry of the mesh and re-render the graphics.
 * @param {THREE.mesh} mesh The mesh containing the old geometry
 * @param {THREE.geometry} geometry The new geometry
 */
function updateGeometry(mesh, geometry){
	mesh.geometry.dispose();
	mesh.geometry = geometry;
	render();
}

/**
 * Add a folder to the gui that enables the user to resize the floor.
 */
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

/** Update the name of the element to that given in the gui. */
function updateElementName(){
	currentObject.name = gui.elInfo.Name;
}

// It is sometimes necessary to handle each dimension separately,
// otherwise the object's position attributes can get overwritten by whatever old values
// are in the gui before the gui has been updated to show the parameters of the new object that has just been selected.
/**
 * Move the selected geometry (stored in currentObject) to the x location set in the gui.
 */
function moveGeometryX(){
	currentObject.position.x = jsonToGl(currentObject, "x", gui.posParams.x);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}

/**
 * Move the selected geometry (stored in currentObject) to the y location set in the gui.
 */
function moveGeometryY(){
	currentObject.position.y = jsonToGl(currentObject, "y", gui.posParams.y);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}

/**
 * Move the selected geometry (stored in currentObject) to the z location set in the gui.
 */
function moveGeometryZ(){
	currentObject.position.z = jsonToGl(currentObject, "z", gui.posParams.z);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}

/**
 * Move the selected geometry (stored in currentObject) to the (x,y,z) location set in the gui.
 */
function moveGeometryXYZ(){
	currentObject.position.x = jsonToGl(currentObject, "x", gui.posParams.x);
	currentObject.position.y = jsonToGl(currentObject, "y", gui.posParams.y);
	currentObject.position.z = jsonToGl(currentObject, "z", gui.posParams.z);
	currentObject.geometry.attributes.position.needsUpdate = true;
	render();
}

/**
 * Rotate the selected geometry (stored in currentObject) on the x-axis according to the angle (in degrees) set in the gui.
 */
function rotateGeometryX(){
	const newAngle = gui.rotateParams.x * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleX;
	currentObject.rotateX(rotation);
	currentObject.currentAngleX = newAngle;
	moveGeometryXYZ();  // Ensure the front left corner is still in the correct location
	render();
}

/**
 * Rotate the selected geometry (stored in currentObject) on the y-axis according to the angle (in degrees) set in the gui.
 */
function rotateGeometryY(){
	const newAngle = gui.rotateParams.y * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleY;
	currentObject.rotateY(rotation);
	currentObject.currentAngleY = newAngle;
	moveGeometryXYZ();  // Ensure the front left corner is still in the correct location
	render();
}

/**
 * Rotate the selected geometry (stored in currentObject) on the z-axis according to the angle (in degrees) set in the gui.
 */
function rotateGeometryZ(){
	const newAngle = gui.rotateParams.z * (Math.PI/180)
	const rotation = newAngle - currentObject.currentAngleZ;
	currentObject.rotateZ(rotation);
	currentObject.currentAngleZ = newAngle;
	moveGeometryXYZ();  // Ensure the front left corner is still in the correct location
	render();
}

/**
 * Update the contextual type of the selected object to that selected in the gui.
 */
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

/**
 * Update the material type of the selected object to that selected in the gui.
 */
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

/**
 * Update the geometry type (that will be stored in the json file) of the selected object to that selected in the gui.
 */
function updateJsonGeometry(){
	currentObject.el_geometry = gui.geometry.Type;
	colours.makeGeometryColourVisible(gui.geometry.Type);
	if (gui.gui.children[gui.guiIdx.colours].children[gui.colIdx.scheme].getValue() == "geometry"
			&& currentObject.material.color.getHex() != colours.otherColours['Orphans']
			&& currentObject.material.color.getHex() != colours.otherColours['Selected element']) {
		currentObject.material.color.setHex(colours.geometryColours[currentObject.el_geometry]);
	}
	// If a "shell" geometry is chosen then show the thickenss parameter in the gui, otherwise hide it.
	if (gui.geometry.Type != undefined && gui.geometry.Type.substring(0, 5) == "shell"){
		gui.currentFolder.children[gui.currentFolder.children.length-1].show();
	} else {
		const lastFolderItem =  gui.currentFolder.children[gui.currentFolder.children.length-1]
		if (lastFolderItem.property == "thickness"){
			gui.currentFolder.children[gui.currentFolder.children.length-1].hide();
		}
	}
	render();
}

/**
 * Update the thickness of the selected object with the given value.
 * @param {float} value 
 */
function updateThickness(value){
	currentObject.geometry.parameters['thickness'] = value;
}

/* Note that each init##Gui() function has a check like:
 * if (currentObject.geometry.parameters[changedParam] != value)
 * This is because when we select an object the gui gets updated to show the dimensions of that object,
 * which then triggers the gui.onChange() effect.
 * The if-statement therefore checks if the parameter was actually changed by the user (in which case we need to re-render the object)
 * or if it is just a change in which object the user has selected (in which case we don't need to do anything).
 */

/**
 * Initialise the gui folder used for editing the dimensions of a cuboid.
 */
function initBoxGui(){
	gui.boxFolder.children[gui.boxIdx.length].onChange(value => updateParameters("width", value));
	gui.boxFolder.children[gui.boxIdx.height].onChange(value => updateParameters("height", value));
	gui.boxFolder.children[gui.boxIdx.width].onChange(value => updateParameters("depth", value));
	gui.boxFolder.children[gui.boxIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
						new THREE.BoxGeometry(newParams.width, newParams.height, newParams.depth));
			moveGeometryXYZ();  // move the object back into its correct corner location
		}
	}
}
  
/**
 * Initialise the gui folder used for editing the dimensions of a sphere.
 */
function initSphereGui(){
	gui.sphereFolder.children[gui.sphIdx.radius].onChange(updateParameters);
	gui.sphereFolder.children[gui.sphIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(){
		if (currentObject.geometry.parameters.radius != gui.sphereParams.radius) {
			updateGeometry(currentObject, new THREE.SphereGeometry(gui.sphereParams.radius));
			moveGeometryXYZ();
		}
	}
}

/**
 * Initialise the gui folder used for editing the dimensions of a cylinder.
 */
function initCylinderGui(){
	gui.cylinderFolder.children[gui.cylIdx.radius].onChange(value => updateParameters("radiusTop", value));
	gui.cylinderFolder.children[gui.cylIdx.length].onChange(value => updateParameters("height", value));
	gui.cylinderFolder.children[gui.cylIdx.thickness].onChange(value => updateThickness(value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			if (changedParam == "radiusTop"){
				newParams["radiusBottom"] = value;  // they must be the same
			}
			updateGeometry(currentObject,
						new THREE.CylinderGeometry(newParams.radiusTop, newParams.radiusBottom, newParams.height));
			currentObject.geometry.rotateZ(Math.PI/2);
			render();
			moveGeometryXYZ();
		}
	}
}

/**
 * Initialise the gui folder used for editing the dimensions of an oblique cylinder (translateAndScale cylinder).
 */
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
			moveGeometryXYZ();
		}
	}
}

/**
 * Initialise the gui folder used for editing the dimensions of a trapezoid (translateAndScale cuboid).
 */
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
			const newParams = {...currentObject.geometry.parameters};
			newParams[changedParam] = value;
			updateGeometry(currentObject,
				new TrapezoidGeometry(newParams.leftTransY, newParams.leftTransZ, newParams.leftDimensY, newParams.leftDimensZ,
									newParams.rightTransY, newParams.rightTransZ, newParams.rightDimensY, newParams.rightDimensZ,
									newParams.width));
			moveGeometryXYZ();
		}
	}
}

/**
 * Initialise the gui folder used for editing the dimensions of a beam (I or C).
 */
function initBeamGui(){
	gui.beamFolder.children[gui.beamIdx.length].onChange(value => updateParameters("width", value));
	gui.beamFolder.children[gui.beamIdx.h].onChange(value => updateParameters("h", value));
	gui.beamFolder.children[gui.beamIdx.s].onChange(value => updateParameters("s", value));
	gui.beamFolder.children[gui.beamIdx.t].onChange(value => updateParameters("t", value));
	gui.beamFolder.children[gui.beamIdx.b].onChange(value => updateParameters("b", value));
	function updateParameters(changedParam, value){
		if (currentObject.geometry.parameters[changedParam] != value){  // don't regenerate to the object if we're just updating the gui
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
			moveGeometryXYZ();
			render();
		}
	}
}

/* The following functions deal with relationships between elements.
   The elements involved in a relationship are stored in alphabetical order of element id
   (the id value that threejs has assigned to the object),
   so we can easily check if a relationship already exists between a set of elements.
*/

/**
 * Sort the identification numbers of the selected threejs objects.
 * @returns list of integers
 */
function sortedSelectedIds(){
	let elementIds = [];
	for (let i=0; i<selectedObjects.length; i++){
		elementIds.push(selectedObjects[i].id)
	}
	elementIds.sort();
	return elementIds;
}

/**
 * Update the dict 'relationships' to assign the given relationship type against the selected objects.
 * @param {string} value relationship type
 */
function updateRelationship(value){
	if (value != 'none') {
		const elementIds = sortedSelectedIds();
		// Check if a relationship is already defined for these elements
		if (relationships[elementIds] != undefined) {
			// If they're already related then update the relationship (or remove it if 'none' has been selected)
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

/**
 * Update the dict 'relationshipNatures' to assign the given relationship nature against the selected objects.
 * @param {string} value relationship type
 */
function updateRelationshipNature(value){
	const elementIds = sortedSelectedIds();
	relationshipNatures[elementIds] = value;
}

/**
 * Highlight orphaned elements using the colour given in gui, or set colours back to normal.
 * @param {boolean} value If the checkbox to selected to highlight orphaned elements
 */
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

/**
 * Get the current relationship type of the selected elements.
 * @returns string
 */
function currentRelationship(){
	const elementIds = sortedSelectedIds();
	if (relationships[elementIds] == undefined){
		return 'none';
	}
	return relationships[elementIds]
}

/**
 * Get the current relationship nature of the selected elements.
 * @returns string
 */
function currentRelationshipNature(){
	const elementIds = sortedSelectedIds();
	if (relationshipNatures[elementIds] == undefined){
		return 'none';
	}
	return relationshipNatures[elementIds]
}

/**
 * Hide elements that are connected to others to help see where orphaned elements remain.
 * @param {boolean} value If the checkbox is selected to hide elements that are connected to others
 */
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

/**
 * Render the graphics.
 */
function render() {
	renderer.render( scene, camera );
}

export {buildModel};