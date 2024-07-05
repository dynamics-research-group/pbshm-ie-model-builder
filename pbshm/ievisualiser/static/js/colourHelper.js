export const otherColours = {"ground": 0x5e5c64,
                      "Orphans": 0xFDEE00,
                      "Selected element": 0xFEFEFA};


export const builderColours = {"BoxGeometry": 0xe6194b,
						"SphereGeometry": 0x3cb44b,
						"CylinderGeometry": 0xE0B0FF,
						"ObliqueCylinderGeometry": 0x7FFFD4,
						"TrapezoidGeometry": 0x4363d8,
						"IBeamGeometry": 0xf58231,
						"CBeamGeometry": 0xfbceb1,
                        "ground": 0x5e5c64}


export const contextualColours = {"slab":0xa96645, "column":0x58C2EB, "beam":0x7b6bb0,
                 "block":0x783372, "cable":0x71c1fe, "wall":0x5363cc,
                 "plate":0xd1dfb9, "deck":0xe59bc1,
                 "aerofoil":0x79a9b9, "wing":0xf1c533, "fuselage":0x47620e,
                 "tower":0x401952, "wheel":0xe7c5c7, "other":0x63452c};


/*  metals: red,
    ceramics: green,
    polymers: blue
    composites: purple */
export const materialColours = {"metal-ferrousAlloy":0xEE204E,
                          "metal-ferrousAlloy-steel":0xAB274F,
                          "metal-ferrousAlloy-iron":0x7C0902,
                          "metal-aluminiumAlloy":0xFE6F5E,
                          "metal-nickelAlloy":0xFB607F,
                          "metal-copperAlloy":0xC51E3A,
                          "metal-titaniumAlloy":0x800020,
                          "ceramic-glass":0x8DB600,
                          "ceramic-clayProduct":0x7BA05B,
                          "ceramic-refractory":0x568203,
                          "ceramic-abrasive":0x004225,
                          "ceramic-cement":0xACE1AF,
                          "ceramic-advancedCeramic":0xADFF2F,
                          "polymer-thermoplastic":0x00B9E8,
                          "polymer-thermoset":0x5D8AA8,
                          "polymer-elastomer":0x6CB4EE,
                          "composite-particle-reinforced":0xB284BE,
                          "composite-fibre-reinforced":0x702963,
                          "composite-structural":0x9966CC,
                          "other":0x63452c};


/* beams : blue,
   plates: purple,
   solids: red,
   shells: green */
export const geometryColours = {"beam rectangular": 0x00B9E8,
                          "beam circular": 0x5D8AA8,
                          "beam i-beam": 0x6CB4EE,
                          "beam other": 0x0070BB,
                          "plate rectangular": 0xB284BE,
                          "plate circular": 0x702963,
                          "plate other": 0x9966CC,
                          "solid translate cuboid": 0xAB274F,
                          "solid translate sphere": 0x7C0902,
                          "solid translate cylinder": 0xFE6F5E,
                          "solid translate other": 0xFB607F,
                          "shell translate cuboid": 0x90EE90,
                          "shell translate sphere": 0x8DB600,
                          "shell translate cylinder": 0x7BA05B,
                          "shell translate other": 0x568203,
                          "solid translateAndScale cuboid": 0x800020,
                          "solid translateAndScale cylinder": 0xFDBCB4,
                          "solid translateAndScale other": 0xC51E3A,
                          "shell translateAndScale cuboid": 0x004225,
                          "shell translateAndScale cylinder": 0xACE1AF,
                          "shell translateAndScale other": 0xADFF2F,
                          "other":0x63452c};


/* perfect: brown,
   boundary: grey,
   connection static: blue,
   connection dynamic: purple,
   joint static: red,
   joint dynamic: green */
export const relationshipColours = {'perfect': 0x000000,
                            'boundary': 0x5e5c64,
                            'connection static bolted': 0x00B9E8,
                            'connection static welded': 0x5D8AA8,
                            'connection static adhesive': 0x6CB4EE,
                            'connection static other': 0x0070BB,
                            'connection dynamic hinge': 0x702963,
                            'connection dynamic ballAndSocket': 0x9966CC,
                            'connection dynamic pinned': 0xB284BE,
                            'connection dynamic other': 0xB53389,
                            'joint static bolted': 0xAB274F,
                            'joint static welded': 0x7C0902,
                            'joint static adhesive': 0xFE6F5E,
                            'joint static other': 0xFB607F,
                            'joint dynamic hinge': 0x90EE90,
                            'joint dynamic ballAndSocket': 0x8DB600,
                            'joint dynamic pinned': 0x7BA05B,
                            'joint dynamic expansion': 0xACE1AF,
                            'joint dynamic other': 0x004225}


export const contextualColourKeys = Object.keys(contextualColours);
contextualColourKeys.sort();

export const materialColourKeys = Object.keys(materialColours);
materialColourKeys.sort();

const geometryColourKeys = Object.keys(geometryColours);
geometryColourKeys.sort();

const relationshipColourKeys = Object.keys(relationshipColours);
relationshipColourKeys.sort();


let contextualColoursFolder, materialColoursFolder, geometryColoursFolder, relationshipColoursFolder;
export let cElements = [];  // list of threejs meshes that are on the screen (excluding the floor)
export let cLines = [];  // list of threejs lines (highlighting connections in an attributed graph)


/**
 * Add objects for handling colours to the lilgui coloursFolder.
 * @param {lilgui.folder} coloursFolder The folder in which colours are to be added
 * @param {function} render The function used to render threejs graphics
 * @param {string} defaultScheme The colour scheme to be automatically selected on load (default:"contextual")
 * @param {boolean} includeNetworkEdges Whether to show colour options for the edges in an attributed graph (choose false if not rendering a graph) (default:false)
 */
export function addColourFolders(coloursFolder, render, defaultScheme="contextual", includeNetworkEdges=false) {
    // Find out what contexts, materials and geometries are used by the cElements
    let schemes;
    if (defaultScheme == 'builder'){
        schemes = ['builder', 'contextual', 'material', 'geometry'];
    } else {
        schemes = ['contextual', 'material', 'geometry'];
    }
    coloursFolder.add({'colour scheme':defaultScheme},
                       'colour scheme',
                       schemes).onChange( value => {updateColourScheme(value)} );

    coloursFolder.addColor(otherColours, "ground").onChange(value => {updateGroundColour(value);});
    
    // Initially hide all colours in the gui, and then make them visible when an element requires it
    let i ;
    contextualColoursFolder = coloursFolder.addFolder('Contextual Colours');
    if (defaultScheme == 'builder'){
        contextualColoursFolder.hide();
    }
    for (i=0; i<contextualColourKeys.length; i++) {
        contextualColoursFolder.addColor(contextualColours, contextualColourKeys[i]).onChange( value => {updateColourScheme('contextual')} );;
        contextualColoursFolder.children[i].hide();
    }

    materialColoursFolder = coloursFolder.addFolder('Material Colours');
    materialColoursFolder.hide();
    for (i=0; i<materialColourKeys.length; i++) {
        materialColoursFolder.addColor(materialColours, materialColourKeys[i]).onChange( value => {updateColourScheme('material')} );;
        materialColoursFolder.children[i].hide();
    }

    geometryColoursFolder = coloursFolder.addFolder('Geometry Colours');
    geometryColoursFolder.hide();
    for (i=0; i<geometryColourKeys.length; i++) {
        geometryColoursFolder.addColor(geometryColours, geometryColourKeys[i]).onChange( value => {updateColourScheme('geometry')} );;
        geometryColoursFolder.children[i].hide();
    }

    if (includeNetworkEdges){
        relationshipColoursFolder = coloursFolder.addFolder('Relationship Colours');
        for (i=0; i<relationshipColourKeys.length; i++) {
            relationshipColoursFolder.addColor(relationshipColours, relationshipColourKeys[i]).onChange( value => {updateColourScheme('edges')} );;
            relationshipColoursFolder.children[i].hide();
        }
    }

    /**
     * Update the colour of ground elements.
     * @param {hex} value Colour of ground elements
     */
    function updateGroundColour(value){
        for (let i=0; i<cElements.length; i++) {
            if (cElements[i].el_contextual == "ground") {
                cElements[i].material.color.setHex(value);
            }
        }
        render();
    }

    /**
     * Update the colours of all elements on the screen to the selected colour scheme.
     * @param {string} scheme Selected colour scheme from the gui dropdown box
     */
    function updateColourScheme(scheme){
        if (scheme == "material") {
            contextualColoursFolder.hide();
            materialColoursFolder.show();
            geometryColoursFolder.hide();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground"
                        && cElements[i].material.color.getHex() != otherColours['Orphans']
                        && cElements[i].material.color.getHex() != otherColours['Selected element']) {
                    cElements[i].material.color.setHex(materialColours[cElements[i].el_material]);
                }
            }
        } else if (scheme == "contextual") {
            contextualColoursFolder.show();
            materialColoursFolder.hide();
            geometryColoursFolder.hide();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground"
                        && cElements[i].material.color.getHex() != otherColours['Orphans']
                        && cElements[i].material.color.getHex() != otherColours['Selected element']) {
                    cElements[i].material.color.setHex(contextualColours[cElements[i].el_contextual]);
                }
            }
        } else if (scheme == "geometry") {
            contextualColoursFolder.hide();
            materialColoursFolder.hide();
            geometryColoursFolder.show();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground"
                        && cElements[i].material.color.getHex() != otherColours['Orphans']
                        && cElements[i].material.color.getHex() != otherColours['Selected element']) {
                    cElements[i].material.color.setHex(geometryColours[cElements[i].el_geometry]);
                }
            }
        } else if (scheme == "builder") {
            contextualColoursFolder.hide();
            materialColoursFolder.hide();
            geometryColoursFolder.hide();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground"
                        && cElements[i].material.color.getHex() != otherColours['Orphans']
                        && cElements[i].material.color.getHex() != otherColours['Selected element']) {
                    cElements[i].material.color.setHex(builderColours[cElements[i].geometry.type]);
                }
            }
        } else if (scheme == "edges") {
            for (let i=0; i<cLines.length; i++) {
                cLines[i].material.color.setHex(relationshipColours[cLines[i].nature]);
            }

        }
        render();
    }
}


/**
 * Update the list of colours within the gui to show the contextual colour used by a given element.
 * @param {string} context The contextual type to be shown.
 */
export function makeContextColourVisible(context){
    if (context != undefined) {  // context will be undefined if the element has only just been created
        const i = contextualColourKeys.indexOf(context);
        contextualColoursFolder.children[i].show();
    }
}

/**
 * Update the list of colours within the gui to show the material colour used by a given element.
 * @param {string} context The material type to be shown.
 */
export function makeMaterialColourVisible(material){
    if (material != undefined) {
        const i = materialColourKeys.indexOf(material);
        materialColoursFolder.children[i].show();
    }
}

/**
 * Update the list of colours within the gui to show the geometry colour used by a given element.
 * @param {string} context The geometry type to be shown.
 */
export function makeGeometryColourVisible(geometry){
    if (geometry != undefined) {
        const i = geometryColourKeys.indexOf(geometry);
        geometryColoursFolder.children[i].show();
    }
}

/**
 * Update the list of colours within the gui to show the relationship colour used by a given element.
 * @param {string} context The relationship type to be shown.
 */
export function makeEdgeColourVisible(relationship){
    if (relationship != undefined) {
        const i = relationshipColourKeys.indexOf(relationship);
        relationshipColoursFolder.children[i].show();
    }
}

/**
 * Reset the colour of a specific element to the original colour in the scheme.
 * Used when an element temporarily changed colour (e.g. when selecting it).
 * @param {string} scheme The selected colour scheme.
 * @param {THREE.Mesh} element The element to be updated.
 */
export function resetColour(scheme, element){
    if (element.el_contextual == "ground") {
        element.material.color.setHex(otherColours["ground"]);
    } else {
        if (scheme == 'builder'){
            element.material.color.setHex(builderColours[element.geometry.type]);
        } else if (scheme == 'material') {
            element.material.color.setHex(materialColours[element.el_material]);
        } else if (scheme == 'geometry') {
            element.material.color.setHex(geometryColours[element.el_geometry]);
        } else if (scheme == 'contextual') {
            element.material.color.setHex(contextualColours[element.el_contextual]);
        }
    }
}

/**
 * Resets the colour of all elements of the model to the original colours in the scheme.
 * Used when elements have temporarily changed colour (e.g. when selecting them).
 * @param {string} scheme The selected colour scheme.
 */
export function resetColours(scheme){
    for (let el of cElements){
        resetColour(scheme, el);
    }
}
