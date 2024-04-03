import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import {glToJson} from './translationHelper.js';
import { materialColourKeys, contextualColourKeys, otherColours} from './colourHelper.js';


// Note that any parts of the gui that are related to colours are handled in colourHelper.js

export const gui = new GUI();

export const modelDetails = {'Name': '', 'Description': '', 'Population': '', 'Type': 'grounded'};
export const modelDetailsFolder = gui.addFolder('Model details');
modelDetailsFolder.add(modelDetails, 'Name').onChange( value => { modelDetails['Name'] = value; });
modelDetailsFolder.add(modelDetails, 'Description').onChange( value => { modelDetails['Description'] = value; });
modelDetailsFolder.add(modelDetails, 'Population').onChange( value => { modelDetails['Population'] = value; });
modelDetailsFolder.add(modelDetails, 'Type', ['grounded', 'free']);

export const coloursFolder = gui.addFolder('Colours');
// The colours must be added using colourHelper.addColourFolders, which requires a renderer.

// Folder for defining relationships between elements
export const relationFolder = gui.addFolder('Relationships');
const elRelationship = {'Relationship': 'none', 'Nature': undefined}  // current relationship type selected
const relationshipTypes = {'free': ['none', 'perfect', 'connection', 'joint'],
                        'grounded': ['none', 'boundary'],
                        'nature': ['static bolted', 'static welded', 'static adhesive', 'static other',
                                    'dynamic hinge', 'dynamic ballAndSocket', 'dynamic pinned',
                                    'dynamic expansion', 'dynamic ballBearing', 'dynamic other']};
const showElements = {'Show orphans': false, 'Hide connected': false};
relationFolder.add(showElements, 'Show orphans');
relationFolder.addColor(otherColours, 'Orphans');
relationFolder.add(showElements, 'Hide connected');
relationFolder.add(elRelationship, 'Relationship', relationshipTypes['free']);
relationFolder.add(elRelationship, 'Relationship', relationshipTypes['grounded']);
relationFolder.add(elRelationship, 'Nature', relationshipTypes['nature']);
relationFolder.children[3].hide();
relationFolder.children[4].hide();
relationFolder.children[5].hide();


export const elementFolder = gui.addFolder('Element');
export const elInfo = {'Name': ''}
elementFolder.add(elInfo, 'Name');
elementFolder.hide();


// Coordinates folders
export const posParams = {'x': 0,
                    'y': 0,
                'z': 0};
export const rotateParams = {'x': 0,
                    'y': 0,
                    'z': 0}
export const coordsFolder = elementFolder.addFolder('Coordinates');
export const gCoordsFolder = coordsFolder.addFolder('Global');
export const transFolder = gCoordsFolder.addFolder('Translational');
export const rotFolder = gCoordsFolder.addFolder('Rotational');
transFolder.add(posParams, 'x');
transFolder.add(posParams, 'y');
transFolder.add(posParams, 'z');
rotFolder.add(rotateParams, 'x', 0, 360);
rotFolder.add(rotateParams, 'y', 0, 360);
rotFolder.add(rotateParams, 'z', 0, 360);

// Material information
export const material = {"Type": "other"};
export const materialFolder = elementFolder.addFolder('Material');
materialFolder.add(material, 'Type', materialColourKeys);


// Contextual information
export const context = {'Type': 'other'};
export const contextualFolder = elementFolder.addFolder('Contextual');
contextualFolder.add(context, 'Type', contextualColourKeys);


// Geometry information
export const geometry = {"Type": undefined}
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
export const geometryFolder = elementFolder.addFolder('Geometry');
for (let i=0; i<geometryKeys.length; i++){
    geometryFolder.add(geometry, 'Type', jsonGeometryMappings[geometryKeys[i]]);
    geometryFolder.children[i].hide();
}
geometryFolder.hide();


// Geometry parameters
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


// Geometry folders (that set the parameters)
export const boxFolder = elementFolder.addFolder('Geometry Dimensions');
boxFolder.add(boxParams, 'length');
boxFolder.add(boxParams, 'height');
boxFolder.add(boxParams, 'width');
boxFolder.add(boxParams, 'thickness');
boxFolder.children[3].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

export const sphereFolder = elementFolder.addFolder('Geometry Dimensions');
sphereFolder.add(sphereParams, 'radius');
sphereFolder.add(sphereParams, 'thickness');
sphereFolder.children[1].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

export const cylinderFolder = elementFolder.addFolder('Geometry Dimensions');
cylinderFolder.add(cylinderParams, 'radius');
cylinderFolder.add(cylinderParams, 'length');
cylinderFolder.add(cylinderParams, 'thickness');
cylinderFolder.children[2].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

export const obliqueCylinderFolder = elementFolder.addFolder('Geometry Dimensions');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces left radius');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces right radius');
obliqueCylinderFolder.add(obliqueCylinderParams, 'length');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Left Trans. y');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Left Trans. z');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Right Trans. y');
obliqueCylinderFolder.add(obliqueCylinderParams, 'Faces Right Trans. z');
obliqueCylinderFolder.add(obliqueCylinderParams, 'thickness');
obliqueCylinderFolder.children[7].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

export const trapezoidFolder = elementFolder.addFolder('Geometry Dimensions');
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
trapezoidFolder.children[9].hide();  // Thickness is only necesssary for shells so hide until shell geometry is chosen

export const beamFolder = elementFolder.addFolder('Geometry Dimensions');
beamFolder.add(beamParams, "length");
beamFolder.add(beamParams, "h");
beamFolder.add(beamParams, "s");
beamFolder.add(beamParams, "t");
beamFolder.add(beamParams, "b");


export let currentFolder;
export function setCurrentFolder(folder){
    currentFolder = folder;
}
   
export function setGeometryFolder(currentObject){
    hideGeometryFolders();  // First hide all, then show the one relevant folder
    const geometryType = currentObject.geometry.type;
    if (geometryType == "BoxGeometry"){
        boxFolder.children[0].setValue(currentObject.geometry.parameters.width);
        boxFolder.children[1].setValue(currentObject.geometry.parameters.height);
        boxFolder.children[2].setValue(currentObject.geometry.parameters.depth);
        currentFolder = boxFolder;
        showGeometryDropdown("box", currentObject);
    } else if (geometryType == "SphereGeometry"){
        sphereFolder.children[0].setValue(currentObject.geometry.parameters.radius);
        currentFolder = sphereFolder;
        showGeometryDropdown("sphere", currentObject);
    } else if (geometryType == "CylinderGeometry"){
        cylinderFolder.children[0].setValue(currentObject.geometry.parameters.radiusTop);
        cylinderFolder.children[1].setValue(currentObject.geometry.parameters.height);
        currentFolder = cylinderFolder;
        showGeometryDropdown("cylinder", currentObject);
    } else if (geometryType == "ObliqueCylinderGeometry"){
        obliqueCylinderFolder.children[0].setValue(currentObject.geometry.parameters.radiusTop);
        obliqueCylinderFolder.children[1].setValue(currentObject.geometry.parameters.radiusBottom);
        obliqueCylinderFolder.children[2].setValue(currentObject.geometry.parameters.height);
        obliqueCylinderFolder.children[3].setValue(currentObject.geometry.parameters['Faces Left Trans. y']);
        obliqueCylinderFolder.children[4].setValue(currentObject.geometry.parameters['Faces Left Trans. z']);
        obliqueCylinderFolder.children[5].setValue(currentObject.geometry.parameters['Faces Right Trans. y']);
        obliqueCylinderFolder.children[6].setValue(currentObject.geometry.parameters['Faces Right Trans. z']);
        currentFolder = obliqueCylinderFolder;
        showGeometryDropdown("obliqueCylinder", currentObject);
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
        showGeometryDropdown("trapezoid", currentObject);
    } else if (geometryType == "IBeamGeometry" || geometryType == "CBeamGeometry"){
        beamFolder.children[0].setValue(currentObject.geometry.parameters["width"]);
        beamFolder.children[1].setValue(currentObject.geometry.parameters["h"]);
        beamFolder.children[2].setValue(currentObject.geometry.parameters["s"]);
        beamFolder.children[3].setValue(currentObject.geometry.parameters["t"]);
        beamFolder.children[4].setValue(currentObject.geometry.parameters["b"]);
        currentFolder = beamFolder;
        showGeometryDropdown("beam", currentObject);
    } else {
        // Need to deselect if we click away so we don't accidentally edit something else (e.g. the plane)
        currentFolder = undefined;
    }
    // If the ground plane has been selected, or anywhere outside of this then there'll be no current folder.
    elementFolder.children[0].setValue(currentObject.name);
    elementFolder.show();
    if (currentObject.el_contextual == "ground") {
        gCoordsFolder.hide();
        contextualFolder.hide();
        materialFolder.hide();
        geometryFolder.hide();
    }
    if (currentFolder != undefined){
        transFolder.children[0].setValue(glToJson(currentObject, "x", currentObject.position.x));
        transFolder.children[1].setValue(glToJson(currentObject, "y", currentObject.position.y));
        transFolder.children[2].setValue(glToJson(currentObject, "z", currentObject.position.z));
        rotFolder.children[0].setValue(currentObject.rotation.x * (180 / Math.PI));
        rotFolder.children[1].setValue(currentObject.rotation.y * (180 / Math.PI));
        rotFolder.children[2].setValue(currentObject.rotation.z * (180 / Math.PI));
        materialFolder.children[0].setValue(currentObject.el_material);
        contextualFolder.children[0].setValue(currentObject.el_contextual);
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


export function setViewerMode(){
    relationFolder.hide();
	let child;
	elementFolder.children[0].disable();
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