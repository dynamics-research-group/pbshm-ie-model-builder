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

export {extractShapes, extractRelationships}