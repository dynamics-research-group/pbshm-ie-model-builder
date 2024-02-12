const groundColour = {"ground": 0xaaaaaa};


const builderColours = {"BoxGeometry": 0xe6194b,
						"SphereGeometry": 0x3cb44b,
						"CylinderGeometry": 0xffe119,
						"ObliqueCylinderGeometry": 0xf8de7e,
						"TrapezoidGeometry": 0x4363d8,
						"IBeamGeometry": 0xf58231,
						"CBeamGeometry": 0xfbceb1}


const contextualColours = {"slab":0xa96645, "column":0x58C2EB, "beam":0x7b6bb0,
                 "block":0x783372, "cable":0x71c1fe, "wall":0x5363cc,
                 "plate":0xd1dfb9, "deck":0xe59bc1,
                 "aerofoil":0x79a9b9, "wing":0xf1c533, "fuselage":0x47620e,
                 "tower":0x401952, "wheel":0xe7c5c7, "other":0x63452c};


/*  metals: red,
    ceramics: green,
    polymers: blue
    composites: purple */
const materialColours = {"metal-ferrousAlloy":0xEE204E,
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
const geometryColours = {"beam-rectangular": 0x00B9E8,
                          "beam-circular": 0x5D8AA8,
                          "beam-i-beam": 0x6CB4EE,
                          "beam-other": 0x0070BB,
                          "plate-rectangular": 0xB284BE,
                          "plate-circular": 0x702963,
                          "plate-other": 0x9966CC,
                          "solid-translate-cuboid": 0xAB274F,
                          "solid-translate-sphere": 0x7C0902,
                          "solid-translate-cylinder": 0xFE6F5E,
                          "solid-translate-other": 0xFB607F,
                          "shell-translate-cuboid": 0x90EE90,
                          "shell-translate-sphere": 0x8DB600,
                          "shell-translate-cylinder": 0x7BA05B,
                          "shell-translate-other": 0x568203,
                          "solid-translateAndScale-cuboid": 0x800020,
                          "solid-translateAndScale-cylinder": 0xFDBCB4,
                          "solid-translateAndScale-other": 0xC51E3A,
                          "shell-translateAndScale-cuboid": 0x004225,
                          "shell-translateAndScale-cylinder": 0xACE1AF,
                          "shell-translateAndScale-other": 0xADFF2F,
                          "other":0x63452c};


const contextualColourKeys = Object.keys(contextualColours);
contextualColourKeys.sort();
const materialColourKeys = Object.keys(materialColours);
materialColourKeys.sort();
const geometryColourKeys = Object.keys(geometryColours);
geometryColourKeys.sort();


let contextualColoursFolder, materialColoursFolder, geometryColoursFolder;
let cElements = [];


function addColourFolders(gui, render, defaultScheme="contextual") {
    // Find out what contexts, materials and geometries are used by the cElements
    const coloursFolder = gui.addFolder('Colours');
    let schemes;
    if (defaultScheme == 'builder'){
        schemes = ['builder', 'contextual', 'material', 'geometry'];
    } else {
        schemes = ['contextual', 'material', 'geometry'];
    }
    coloursFolder.add({'colour scheme':defaultScheme},
                       'colour scheme',
                       schemes).onChange( value => {updateColourScheme(value)} );

    coloursFolder.addColor(groundColour, "ground").onChange(value => {updateGroundColour(value);});
    
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


    function updateGroundColour(value){
        for (let i=0; i<cElements.length; i++) {
            if (cElements[i].el_contextual == "ground") {
                cElements[i].material.color.setHex(value);
            }
        }
    }


    function updateColourScheme(scheme){
        if (scheme == "material") {
            contextualColoursFolder.hide();
            materialColoursFolder.show();
            geometryColoursFolder.hide();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground") {
                    cElements[i].material.color.setHex(materialColours[cElements[i].el_material]);
                }
            }
        } else if (scheme == "contextual") {
            contextualColoursFolder.show();
            materialColoursFolder.hide();
            geometryColoursFolder.hide();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground") {
                    cElements[i].material.color.setHex(contextualColours[cElements[i].el_contextual]);
                }
            }
        } else if (scheme == "geometry") {
            contextualColoursFolder.hide();
            materialColoursFolder.hide();
            geometryColoursFolder.show();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground") {
                    cElements[i].material.color.setHex(geometryColours[cElements[i].el_geometry]);
                }
            }
        } else if (scheme == "builder") {
            contextualColoursFolder.hide();
            materialColoursFolder.hide();
            geometryColoursFolder.hide();
            for (let i=0; i<cElements.length; i++) {
                if (cElements[i].el_contextual != "ground") {
                    cElements[i].material.color.setHex(builderColours[cElements[i].geometry.type]);
                }
            }
        }
        render();
    }
}

/* Update the list of colours to include the contextual/material/geometry colour used by a given element.
   Called from builder.js */
function makeContextColourVisible(context){
    if (context != undefined) {  // context will be undefined if the element has only just been created
        const i = contextualColourKeys.indexOf(context);
        contextualColoursFolder.children[i].show();
    }
}


function makeMaterialColourVisible(material){
    if (material != undefined) {
        const i = materialColourKeys.indexOf(material);
        if (i == -1) { console.log(material)};
        materialColoursFolder.children[i].show();
    }
}


function makeGeometryColourVisible(geometry){
    if (geometry != undefined) {
        const i = geometryColourKeys.indexOf(geometry);
        geometryColoursFolder.children[i].show();
    }
}


export {groundColour, builderColours, contextualColours, materialColours, geometryColours, cElements,
        addColourFolders, makeContextColourVisible, makeMaterialColourVisible, makeGeometryColourVisible};