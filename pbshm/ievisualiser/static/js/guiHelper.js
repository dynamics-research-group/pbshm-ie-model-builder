import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import {glToJson} from './translationHelper.js';
import { materialColourKeys, contextualColourKeys, otherColours} from './colourHelper.js';


/*
Note that any parts of the gui that are related to colours are handled in colourHelper.js
The colour folder is added to the gui here but it is empty,
and colours must be added using colourHelper.addColourFolders(), which requires a renderer.

Constants are used to help with indexing the children of folders.
The first three letters are used to indicate the folder, followed by a description of the child.
e.g. relTYPE -> where the relationship type is given.
*/


/*** Variables storing the data displayed in the gui  **/
export const modelDetails = {'Name': '', 'Description': '', 'Population': '', 'Type': 'grounded'};
export const elInfo = {'Name': ''}
export const posParams = {'x': 0,
                          'y': 0,
                          'z': 0};
export const rotateParams = {'x': 0,
                             'y': 0,
                             'z': 0}
export const transIdx = {x:0, y:1, z:2};
export const rotIdx = {x:0, y:1, z:2};
export const material = {"Type": "other"};
export const context = {'Type': 'other'};
export const geometry = {"Type": undefined}
export const boxParams = {'length': 5,
                          'height': 5,
                          'width': 5,
                          'thickness': 1};
export const sphereParams = {'radius': 3,
					         'thickness': 1}
export const cylinderParams = {'radius': 3,
							   'length': 5,
						       'thickness': 1}
export const obliqueCylinderParams = {'Faces left radius': 3,
                                      'Faces right radius': 3,
                                      'Faces Left Trans. y': 0,
                                      'Faces Left Trans. z': 0,
                                      'Faces Right Trans. y': 0,
                                      'Faces Right Trans. z': 0,
                                      'length': 5,
                                      'thickness': 1}
export const trapezoidParams = {"Faces Left Trans. y": 1.5,
                                "Faces Left Trans. z": 1.5,
                                "Faces Left Height": 2,
                                "Faces Left Width": 2,
                                "Faces Right Trans. y": 0,
                                "Faces Right Trans. z": 0,
                                "Faces Right Height": 5,
                                "Faces Right Width": 5,
                                "length": 5,
                                "thickness": 1}
export const beamParams = {"length": 8,
                           "h": 4,
                           "s": 1,
                           "t": 1,
                           "b": 3}
// Geometry information - lists which IE model geometry names are valid for which threejs geometries.
const jsonGeometryMappings = {"box": ["solid translate cuboid", "shell translate cuboid",
                                    "solid translate other", "shell translate other", "other"], 
                            "sphere": ["solid translate sphere", "shell translate sphere",
                                        "solid translate other", "shell translate other", "other"], 
                            "cylinder": ["solid translate cylinder", "shell translate cylinder",
                                        "solid translate other", "shell translate other", "other"], 
                            "beam": ["beam rectangular", "beam i-beam", "beam other", "other"], 
                            "trapezoid": ["solid translateAndScale cuboid", "shell translateAndScale cuboid",
                                            "solid translateAndScale other", "shell translateAndScale other", "other"], 
                            "obliqueCylinder": ["solid translateAndScale cylinder", "shell translateAndScale cylinder",
                                                "solid translateAndScale other", "shell translateAndScale other", "other"]};
export const geometryKeys = Object.keys(jsonGeometryMappings);
geometryKeys.sort();


/*** Folders within the gui ***/
export const gui = new GUI();
export const modelDetailsFolder = gui.addFolder('Model details');
export const coloursFolder = gui.addFolder('Colours');
export const relationFolder = gui.addFolder('Relationships');
export const elementFolder = gui.addFolder('Element');
elementFolder.add(elInfo, 'Name');
export const coordsFolder = elementFolder.addFolder('Coordinates');
export const gCoordsFolder = coordsFolder.addFolder('Global');
export const transFolder = gCoordsFolder.addFolder('Translational');
export const rotFolder = gCoordsFolder.addFolder('Rotational');
export const materialFolder = elementFolder.addFolder('Material');
export const contextualFolder = elementFolder.addFolder('Contextual');
export const geometryFolder = elementFolder.addFolder('Geometry');
export const boxFolder = elementFolder.addFolder('Geometry Dimensions');
export const sphereFolder = elementFolder.addFolder('Geometry Dimensions');
export const cylinderFolder = elementFolder.addFolder('Geometry Dimensions');
export const obliqueCylinderFolder = elementFolder.addFolder('Geometry Dimensions');
export const trapezoidFolder = elementFolder.addFolder('Geometry Dimensions');
export const beamFolder = elementFolder.addFolder('Geometry Dimensions');
export let currentFolder;
export function setCurrentFolder(folder){
    currentFolder = folder;
}

/*** Indexes of the controllers within the gui. ***/
export const guiIdx = {details: 0, colours: 1, relationships:2, elements:3}  // indexes of gui folders
export const colIdx = {scheme: 0};
export const modelIdx = {name:0, desc:1, pop:2, type:3};
export const relIdx = {showOrphans:0, orphanColour:1, hideConn:2, freeTypes:3, connTypes:4, groundTypes:5, natures:6};
export const eleIdx = {name: 0};
export const matIdx = {type: 0};
export const conIdx = {type: 0};
export const boxIdx = {length:0, height:1, width:2, thickness:3};
export const sphIdx = {radius:0, thickness:1};
export const cylIdx = {radius:0, length:1, thickness:2};
export const oblIdx = {leftRadius:0, rightRadius:1, length:2, leftTransY:3, leftTransZ:4, rightTransY:5, rightTransZ:6, thickness:7};
export const trapIdx = {leftTransY:0, leftTransZ:1, leftHeight:2, leftWidth:3,
                       rightTransY:4, rightTransZ:5, rightHeight:6, rightWidth:7,
                       length:8, thickness:9};
export const beamIdx = {length:0, h:1, s:2, t:3, b:4};


/*** Add the controllers to the gui folders. ***/
modelDetailsFolder.add(modelDetails, 'Name').onChange( value => { modelDetails['Name'] = value; });
modelDetailsFolder.add(modelDetails, 'Description').onChange( value => { modelDetails['Description'] = value; });
modelDetailsFolder.add(modelDetails, 'Population').onChange( value => { modelDetails['Population'] = value; });
modelDetailsFolder.add(modelDetails, 'Type', ['grounded', 'free']);

// Folder for defining relationships between elements
const elRelationship = {'Relationship': 'none', 'Nature': undefined}  // current relationship type selected
const relationshipTypes = {'free': ['none', 'perfect', 'connection', 'joint'],
                        'connection': ['none', 'connection'],
                        'grounded': ['none', 'boundary'],
                        'nature': ['static bolted', 'static welded', 'static adhesive', 'static other',
                                    'dynamic hinge', 'dynamic ballAndSocket', 'dynamic pinned',
                                    'dynamic expansion', 'dynamic ballBearing', 'dynamic other']};
const showElements = {'Show orphans': false, 'Hide connected': false};
relationFolder.add(showElements, 'Show orphans');
relationFolder.addColor(otherColours, 'Orphans');
relationFolder.add(showElements, 'Hide connected');
relationFolder.add(elRelationship, 'Relationship', relationshipTypes['free']);
relationFolder.add(elRelationship, 'Relationship', relationshipTypes['connection']);
relationFolder.add(elRelationship, 'Relationship', relationshipTypes['grounded']);
relationFolder.add(elRelationship, 'Nature', relationshipTypes['nature']);
relationFolder.children[relIdx.freeTypes].hide();
relationFolder.children[relIdx.connTypes].hide();
relationFolder.children[relIdx.groundTypes].hide();
relationFolder.children[relIdx.natures].hide();

elementFolder.hide();
transFolder.add(posParams, 'x');
transFolder.add(posParams, 'y');
transFolder.add(posParams, 'z');
rotFolder.add(rotateParams, 'x', 0, 360);
rotFolder.add(rotateParams, 'y', 0, 360);
rotFolder.add(rotateParams, 'z', 0, 360);

materialFolder.add(material, 'Type', materialColourKeys);
contextualFolder.add(context, 'Type', contextualColourKeys);
for (let i=0; i<geometryKeys.length; i++){
    geometryFolder.add(geometry, 'Type', jsonGeometryMappings[geometryKeys[i]]);
    geometryFolder.children[i].hide();
}
geometryFolder.hide();


// Geometry folders (to set their parameters)
boxFolder.add(boxParams, 'length');
boxFolder.add(boxParams, 'height');
boxFolder.add(boxParams, 'width');
boxFolder.add(boxParams, 'thickness');
boxFolder.children[boxIdx.thickness].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

sphereFolder.add(sphereParams, 'radius');
sphereFolder.add(sphereParams, 'thickness');
sphereFolder.children[sphIdx.thickness].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

cylinderFolder.add(cylinderParams, 'radius');
cylinderFolder.add(cylinderParams, 'length');
cylinderFolder.add(cylinderParams, 'thickness');
cylinderFolder.children[cylIdx.thickness].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces left radius');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces right radius');
obliqueCylinderFolder.add(obliqueCylinderParams, 'length');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Left Trans. y');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Left Trans. z');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Right Trans. y');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Right Trans. z');
obliqueCylinderFolder.add(obliqueCylinderParams, 'thickness');
obliqueCylinderFolder.children[oblIdx.thickness].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

trapezoidFolder.add(trapezoidParams, "Faces Left Trans. y");
trapezoidFolder.add(trapezoidParams, "Faces Left Trans. z");
trapezoidFolder.add(trapezoidParams, "Faces Left Height");
trapezoidFolder.add(trapezoidParams, "Faces Left Width");
trapezoidFolder.add(trapezoidParams, "Faces Right Trans. y");
trapezoidFolder.add(trapezoidParams, "Faces Right Trans. z");
trapezoidFolder.add(trapezoidParams, "Faces Right Height");
trapezoidFolder.add(trapezoidParams, "Faces Right Width");
trapezoidFolder.add(trapezoidParams, "length");
trapezoidFolder.add(trapezoidParams, 'thickness');
trapezoidFolder.children[trapIdx.thickness].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

beamFolder.add(beamParams, "length");
beamFolder.add(beamParams, "h");
beamFolder.add(beamParams, "s");
beamFolder.add(beamParams, "t");
beamFolder.add(beamParams, "b");


/* To set which goemetry folder is displayed, hiding all others. */   
export function setGeometryFolder(currentObject){
    hideGeometryFolders();  // First hide all, then show the one relevant folder
    const geometryType = currentObject.geometry.type;
    if (geometryType == "BoxGeometry"){
        boxFolder.children[boxIdx.length].setValue(currentObject.geometry.parameters.width);
        boxFolder.children[boxIdx.height].setValue(currentObject.geometry.parameters.height);
        boxFolder.children[boxIdx.width].setValue(currentObject.geometry.parameters.depth);
        boxFolder.children[boxIdx.thickness].setValue(currentObject.geometry.parameters.thickness);
        currentFolder = boxFolder;
        showGeometryDropdown("box", currentObject);
    } else if (geometryType == "SphereGeometry"){
        sphereFolder.children[sphIdx.radius].setValue(currentObject.geometry.parameters.radius);
        sphereFolder.children[sphIdx.thickness].setValue(currentObject.geometry.parameters.thickness);
        currentFolder = sphereFolder;
        showGeometryDropdown("sphere", currentObject);
    } else if (geometryType == "CylinderGeometry"){
        cylinderFolder.children[cylIdx.radius].setValue(currentObject.geometry.parameters.radiusTop);
        cylinderFolder.children[cylIdx.length].setValue(currentObject.geometry.parameters.height);
        cylinderFolder.children[cylIdx.thickness].setValue(currentObject.geometry.parameters.thickness);
        currentFolder = cylinderFolder;
        showGeometryDropdown("cylinder", currentObject);
    } else if (geometryType == "ObliqueCylinderGeometry"){
        obliqueCylinderFolder.children[oblIdx.leftRadius].setValue(currentObject.geometry.parameters.radiusTop);
        obliqueCylinderFolder.children[oblIdx.rightRadius].setValue(currentObject.geometry.parameters.radiusBottom);
        obliqueCylinderFolder.children[oblIdx.length].setValue(currentObject.geometry.parameters.height);
        obliqueCylinderFolder.children[oblIdx.leftTransY].setValue(currentObject.geometry.parameters['Faces Left Trans. y']);
        obliqueCylinderFolder.children[oblIdx.leftTransZ].setValue(currentObject.geometry.parameters['Faces Left Trans. z']);
        obliqueCylinderFolder.children[oblIdx.rightTransY].setValue(currentObject.geometry.parameters['Faces Right Trans. y']);
        obliqueCylinderFolder.children[oblIdx.rightTransZ].setValue(currentObject.geometry.parameters['Faces Right Trans. z']);
        obliqueCylinderFolder.children[oblIdx.thickness].setValue(currentObject.geometry.parameters.thickness);
        currentFolder = obliqueCylinderFolder;
        showGeometryDropdown("obliqueCylinder", currentObject);
    } else if  (geometryType == "TrapezoidGeometry"){
        trapezoidFolder.children[trapIdx.leftTransY].setValue(currentObject.geometry.parameters.leftTransY);
        trapezoidFolder.children[trapIdx.leftTransZ].setValue(currentObject.geometry.parameters.leftTransZ);
        trapezoidFolder.children[trapIdx.leftHeight].setValue(currentObject.geometry.parameters.leftDimensY);
        trapezoidFolder.children[trapIdx.leftWidth].setValue(currentObject.geometry.parameters.leftDimensZ);
        trapezoidFolder.children[trapIdx.rightTransY].setValue(currentObject.geometry.parameters.rightTransY);
        trapezoidFolder.children[trapIdx.rightTransZ].setValue(currentObject.geometry.parameters.rightTransZ);
        trapezoidFolder.children[trapIdx.rightHeight].setValue(currentObject.geometry.parameters.rightDimensY);
        trapezoidFolder.children[trapIdx.rightWidth].setValue(currentObject.geometry.parameters.rightDimensZ);
        trapezoidFolder.children[trapIdx.length].setValue(currentObject.geometry.parameters.width);
        trapezoidFolder.children[trapIdx.thickness].setValue(currentObject.geometry.parameters.thickness);
        currentFolder = trapezoidFolder;
        showGeometryDropdown("trapezoid", currentObject);
    } else if (geometryType == "IBeamGeometry" || geometryType == "CBeamGeometry"){
        beamFolder.children[beamIdx.length].setValue(currentObject.geometry.parameters["width"]);
        beamFolder.children[beamIdx.h].setValue(currentObject.geometry.parameters["h"]);
        beamFolder.children[beamIdx.s].setValue(currentObject.geometry.parameters["s"]);
        beamFolder.children[beamIdx.t].setValue(currentObject.geometry.parameters["t"]);
        beamFolder.children[beamIdx.t].setValue(currentObject.geometry.parameters["b"]);
        currentFolder = beamFolder;
        showGeometryDropdown("beam", currentObject);
    } else {
        // Need to deselect if we click away so we don't accidentally edit something else (e.g. the plane)
        currentFolder = undefined;
    }
    // If the ground plane has been selected, or anywhere outside of this then there'll be no current folder.
    elementFolder.children[eleIdx.name].setValue(currentObject.name);
    elementFolder.show();
    if (currentObject.el_contextual == "ground") {
        gCoordsFolder.hide();
        contextualFolder.hide();
        materialFolder.hide();
        geometryFolder.hide();
    }
    if (currentFolder != undefined){
        if (currentObject.el_geometry != undefined && currentObject.el_geometry.substring(0, 5) == "shell"){
            // Show the thickness parameter within the (last child of the) geometry folder
            currentFolder.children[currentFolder.children.length-1].show();
        } else {
            const lastFolderItem =  currentFolder.children[currentFolder.children.length-1]
            if (lastFolderItem.property == "thickness"){
                currentFolder.children[currentFolder.children.length-1].hide();
            }
        }
        transFolder.children[transIdx.x].setValue(glToJson(currentObject, "x", currentObject.position.x));
        transFolder.children[transIdx.y].setValue(glToJson(currentObject, "y", currentObject.position.y));
        transFolder.children[transIdx.z].setValue(glToJson(currentObject, "z", currentObject.position.z));
        rotFolder.children[rotIdx.x].setValue(currentObject.rotation.x * (180 / Math.PI));
        rotFolder.children[rotIdx.y].setValue(currentObject.rotation.y * (180 / Math.PI));
        rotFolder.children[rotIdx.z].setValue(currentObject.rotation.z * (180 / Math.PI));
        materialFolder.children[matIdx.type].setValue(currentObject.el_material);
        contextualFolder.children[conIdx.type].setValue(currentObject.el_contextual);
        gCoordsFolder.show();
        contextualFolder.show();
        materialFolder.show();
        currentFolder.show();
    }
}

export function hideGeometryFolders(){
    const folders = [boxFolder, sphereFolder, cylinderFolder, obliqueCylinderFolder,
                     trapezoidFolder, beamFolder];
    folders.forEach(folder => folder.hide());
}

/* Show the json geometry types (e.g. "solid translate sphere")
   that are valid for the given threejs geometry,
   highlighting which has been pre-selected (if any). */
function showGeometryDropdown(geom, currentObject){
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

/* Disable the ability to edit anything in the gui. */
export function setViewerMode(){
    relationFolder.hide();
	let child;
	elementFolder.children[eleIdx.name].disable();
	for (child of modelDetailsFolder.children){ child.disable(); }
	for (child of transFolder.children){ child.disable(); }
	for (child of rotFolder.children){ child.disable(); }
	for (child of materialFolder.children){ child.disable(); }
	for (child of contextualFolder.children){ child.disable(); }
	for (child of geometryFolder.children){ child.disable(); }
	
	for (child of boxFolder.children){ child.disable(); }
	for (child of sphereFolder.children){ child.disable(); }
	for (child of cylinderFolder.children){ child.disable(); }
	for (child of obliqueCylinderFolder.children){ child.disable(); }
	for (child of trapezoidFolder.children){ child.disable(); }
	for (child of beamFolder.children){ child.disable(); }
	
}