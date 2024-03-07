import * as THREE from 'three';
import { glToJson } from "./translationHelper.js";



/**********
 * Loading
 **********/

function modelInfo(rawtext){
	const data = JSON.parse(rawtext);
	return {"name": data.name,
			"description": data.description,
			"population": data.population};
}


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
					element_geom = [elements[i].geometry.type.name, elements[i].geometry.type.type.name, elements[i].geometry.type.type.type.name].join(" ");
				} catch(TypeError) {
					element_geom = [elements[i].geometry.type.name, elements[i].geometry.type.type.name].join(" ");
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
						"element_material": undefined,
						"element_geometry": undefined,
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

function extractRelationships(rawtext){
	const relatDict = {};
	const data = JSON.parse(rawtext);
	const relationships = data.models.irreducibleElement.relationships;
	for (let i=0; i<relationships.length; i++){
		const el1 = relationships[i].elements[0].name;
		const el2 = relationships[i].elements[1].name;
		const r = relationships[i].type;
		relatDict[[el1, el2]] = r;
	}
	return relatDict
}


function relevantDimensions(element){
	const dimension_info = {};
	if (element.geometry.type == "BoxGeometry"){
		dimension_info["length"] = {"axis": "x",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.width}
		dimension_info["height"] = {"axis": "y",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.height}
		dimension_info["width"] = {"axis": "z",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.depth}
	}else if (element.geometry.type == "SphereGeometry"){
		dimension_info["radius"] = {"axis": "x",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.radius}
	} else if (element.geometry.type == "CylinderGeometry"){
		dimension_info["length"] = {"axis": "x",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.height}
		dimension_info["radius"] = {"axis": "y",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.radiusBottom}
	} else if (element.geometry.type == "IBeamGeometry" || element.geometry.type == "CBeamGeometry"){
		dimension_info["length"] = {"axis": "x",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.width}
		dimension_info["h"] = {"axis": "y",
							   "source": "nominal",
							   "unit": "other",
							   "value": element.geometry.parameters.h}
		dimension_info["s"] = {"axis": "z",
								"source": "nominal",
								"unit": "other",
								"value": element.geometry.parameters.s}
		dimension_info["t"] = {"axis": "y",
								"source": "nominal",
								"unit": "other",
								"value": element.geometry.parameters.t}
		dimension_info["b"] = {"axis": "z",
								"source": "nominal",
								"unit": "other",
								"value": element.geometry.parameters.b}
	} else if (element.geometry.type == "TrapezoidGeometry"){
		dimension_info["length"] = {"axis": "x",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.width}
	} else if (element.geometry.type == "ObliqueCylinderGeometry"){
		dimension_info["length"] = {"axis": "x",
									"source": "nominal",
									"unit": "other",
									"value": element.geometry.parameters.height}
	}
	return dimension_info;
}


function relevantFaces(element){
	// For translate and scale elements
	let faces_info = {"left":
						{"translational":
							{"y":
								{"unit": "other", "value": undefined},
							"z":
								{"unit": "other", "value": undefined}},
						"dimensions": {}},
					"right":
						{"translational":
							{"y":
								{"unit": "other", "value": undefined},
							"z":
								{"unit": "other", "value": undefined}},
						"dimensions": {}}};
	if (element.geometry.type == "TrapezoidGeometry"){
		faces_info.left.translational.y.value = element.geometry.parameters.leftTransY;
		faces_info.left.translational.z.value = element.geometry.parameters.leftTransZ;
		faces_info.right.translational.y.value = element.geometry.parameters.rightTransY;
		faces_info.right.translational.z.value = element.geometry.parameters.rightTransZ;
		faces_info.left.dimensions["height"] = {"axis": "y",
												"source": "nominal",
												"unit": "other",
												"value": element.geometry.parameters.leftDimensY}
		faces_info.left.dimensions["width"] = {"axis": "z",
												"source": "nominal",
												"unit": "other",
												"value": element.geometry.parameters.leftDimensZ}
		faces_info.right.dimensions["height"] = {"axis": "y",
												"source": "nominal",
												"unit": "other",
												"value": element.geometry.parameters.rightDimensY}
		faces_info.right.dimensions["width"] = {"axis": "z",
												"source": "nominal",
												"unit": "other",
												"value": element.geometry.parameters.rightDimensZ}
	} else if (element.geometry.type == "ObliqueCylinderGeometry"){
		faces_info.left.translational.y.value = element.geometry.parameters["Faces Left Trans. y"];
		faces_info.left.translational.z.value = element.geometry.parameters["Faces Left Trans. z"];
		faces_info.right.translational.y.value = element.geometry.parameters["Faces Right Trans. y"];
		faces_info.right.translational.z.value = element.geometry.parameters["Faces Right Trans. z"];
		faces_info.left.dimensions["radius"] = {"axis": "y",
												"source": "nominal",
												"unit": "other",
												"value": element.geometry.parameters.radiusBottom}
		faces_info.right.dimensions["radius"] = {"axis": "y",
												"source": "nominal",
												"unit": "other",
												"value": element.geometry.parameters.radiusTop}
	}
	return faces_info;
}

/**********
 * Saving
 **********/

function save(modelDetails, relationships, relationshipNatures, elements){
	let output = {"version": "1.1.0",
                  "name": modelDetails.Name,
				  "description": modelDetails.Description,
				  "population": modelDetails.Population,
				  "timestamp": Date.now() * 1000000,
				  "models": { "irreducibleElement": {
					          "type": modelDetails.Type,  // assumed
            				  "elements": undefined,
							  "relationships": []
				  			  }
							}
				};
	const elements_output = [];
	let elementIdDict = {};  // used to index relationships
	for (const e of elements){
		elementIdDict[e.id] = e;
		const el_dict = {};
		el_dict["name"] = e.name;
		if (e.el_contextual == 'ground'){
			el_dict["type"] = "ground";
		} else {
			el_dict["type"] = "regular";
			// Save contextual info
			if (e.el_contextual != undefined) {
				el_dict["contextual"] = {"type": e.el_contextual};
			}
			// Save material info
			if (e.el_material != undefined) {
				const split = e.el_material.indexOf('-');
				el_dict["material"] = {"type": {"name": e.el_material.substring(0, split),
												"type": {"name": e.el_material.substring(split+1)}}};
			}
			// Save coordinates
			el_dict["coordinates"] = {"global": {"translational": {
				"x": { "unit": "other", "value": glToJson(e, "x", e.position.x)},
				"y": { "unit": "other", "value": glToJson(e, "x", e.position.y)},
				"z": { "unit": "other", "value": glToJson(e, "x", e.position.z)}
			}}};
			// Save geometry info
			const split1 = e.el_geometry.indexOf(' ');
			let split2 = e.el_geometry.substring(split1+1).indexOf(' ');
			el_dict["geometry"] = {"type": {"name": e.el_geometry.substring(0, split1)}}
			if (split2 == -1){
				el_dict.geometry.type["type"] = {"name": e.el_geometry.substring(split1+1)}
			} else {
				split2 += split1 + 1;
				el_dict.geometry.type["type"] = {"name": e.el_geometry.substring(split1+1, split2),
										         "type": {"name": e.el_geometry.substring(split2+1)}}
			}
			el_dict.geometry["dimensions"] = relevantDimensions(e);

			if (el_dict.geometry.type.type.name == "translateAndScale"){
				el_dict.geometry["faces"] = relevantFaces(e);
			}
		}
		elements_output.push(el_dict);
	}
	output.models.irreducibleElement.elements = elements_output;

	for (const [key, value] of Object.entries(relationships)){
		const pair = key.split(',');
		const element1 = elementIdDict[pair[0]];
		const element2 = elementIdDict[pair[1]]
		let relatDict = {"name": element1.name + "-" + element2.name,
						"type": value,
						"elements": [{"name": element1.name},
									{"name": element2.name}]}
		
		if (value == 'joint'){
			const nature = relationshipNatures[key].split(" ");
			relatDict["nature"] = {"name": nature[0], "nature": {"name": nature[1]}};
		}

		// Find out where they're connected if they're not the ground
		if (element1.el_contextual != "ground" && element2.el_contextual != "ground") {
			if (value == 'perfect' || value == 'boundary') {
				const x = new THREE.Box3().setFromObject(element1);
				const y = new THREE.Box3().setFromObject(element2);
				const z = x.intersect(y);  // Get the bounding bounding box of their intersection
				const intersectVector = z.min.add(z.max).divide(new THREE.Vector3(2, 2, 2));  // Get the centre of the box
				relatDict["coordinates"] = {"global": {"translational": {"x": {"unit": "other",
																				"value": intersectVector.x},
																		"y": {"unit": "other",
																				"value": intersectVector.y},
																		"z": {"unit": "other",
																				"value": intersectVector.z}}}}
			} else {
				relatDict.elements[0]["coordinates"] = {"global": {"translational": {"x": {"unit": "other",
																							"value": element1.position.x},
																					"y": {"unit": "other",
																							"value": element1.position.y},
																					"z": {"unit": "other",
																							"value": element1.position.z}}}}
				relatDict.elements[1]["coordinates"] = {"global": {"translational": {"x": {"unit": "other",
																							"value": element2.position.x},
																					"y": {"unit": "other",
																							"value": element2.position.y},
																					"z": {"unit": "other",
																							"value": element2.position.z}}}}
				if (value == 'connection'){
					const nature = relationshipNatures[key].split(" ");
					relatDict.elements[0]["nature"] = {"name": nature[0], "nature": {"name": nature[1]}};
					relatDict.elements[1]["nature"] = {"name": nature[0], "nature": {"name": nature[1]}};
				}
			}
		}
		output.models.irreducibleElement.relationships.push(relatDict);
	}

	
	// Save
	let element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(output, null, 2)));
	element.setAttribute('download', 'temp');
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

export {modelInfo, extractShapes, extractRelationships, save}