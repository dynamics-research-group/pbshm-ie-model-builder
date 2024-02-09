const ground_colour = {"ground": 0xaaaaaa};

const contextual_colours = {"slab":0xa96645, "column":0x58C2EB, "beam":0x7b6bb0,
                 "block":0x783372, "cable":0x71c1fe, "wall":0x5363cc,
                 "plate":0xd1dfb9, "deck":0xe59bc1,
                 "aerofoil":0x79a9b9, "wing":0xf1c533, "fuselage":0x47620e,
                 "tower":0x401952, "wheel":0xe7c5c7, "other":0xe3b694};


/*  metals: red,
    ceramics: green,
    polymers: blue
    composites: purple */
const material_colours = {"metal-ferrousAlloy":0xEE204E,
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
                          "composite-structural":0x9966CC};


/* beams : blue,
   plates: purple,
   solids: red,
   shells: green */
const geometry_colours = {"beam-rectangular": 0x00B9E8,
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
                          "shell-translateAndScale-other": 0xADFF2F};



function addColourFolders(gui, elements) {
    // Find out what contexts, materials and geometries are used by the elements
    let elementContexts = new Set();
    let elementMaterials = new Set();
	let elementGeometries = new Set();
    for (let i=0; i<elements.length; i++) {
        elementContexts.add(elements[i].el_contextual);
        elementMaterials.add(elements[i].el_material);
        elementGeometries.add(elements[i].el_geometry);
    }

    const coloursFolder = gui.addFolder('Colours');
    coloursFolder.add({'colour scheme':'contextual'},
    'colour scheme', ['contextual', 'material', 'geometry']).onChange( value => {updateColourScheme(value)} );

    coloursFolder.addColor(ground_colour, "ground").onChange(value => {updateGroundColour(value);});

    const contextualColoursFolder = coloursFolder.addFolder('Contextual Colours');
    for (const [key, value] of Object.entries(contextual_colours)) {
    // Only show a colour option if there's an element that uses it
    if (elementContexts.has(key)) {
        contextualColoursFolder.addColor(contextual_colours, key).onChange( value => {updateColourScheme('contextual')} );;
    }
    }

    const materialColoursFolder = coloursFolder.addFolder('Material Colours');
    materialColoursFolder.hide();
    for (const [key, value] of Object.entries(material_colours)) {
    // Only show a colour option if there's an element that uses it
    if (elementMaterials.has(key)) {
        materialColoursFolder.addColor(material_colours, key).onChange( value => {updateColourScheme('material')} );;
    }
    }

    const geometryColoursFolder = coloursFolder.addFolder('Geometry Colours');
    geometryColoursFolder.hide();
    for (const [key, value] of Object.entries(geometry_colours)) {
    // Only show a colour option if there's an element that uses it
    if (elementGeometries.has(key)) {
        geometryColoursFolder.addColor(geometry_colours, key).onChange( value => {updateColourScheme('geometry')} );;
    }
    }


    function updateGroundColour(value){
        for (let i=0; i<elements.length; i++) {
            if (elements[i].el_contextual == "ground") {
                elements[i].material.color.setHex(value);
            }
        }
    }


    function updateColourScheme(scheme){
        if (scheme == "material") {
            contextualColoursFolder.hide();
            materialColoursFolder.show();
            geometryColoursFolder.hide();
            for (let i=0; i<elements.length; i++) {
                if (elements[i].el_contextual != "ground") {
                    elements[i].material.color.setHex(material_colours[elements[i].el_material]);
                }
            }
        } else if (scheme == "contextual") {
            contextualColoursFolder.show();
            materialColoursFolder.hide();
            geometryColoursFolder.hide();
            for (let i=0; i<elements.length; i++) {
                if (elements[i].el_contextual != "ground") {
                    elements[i].material.color.setHex(contextual_colours[elements[i].el_contextual]);
                }
            }
        } else if (scheme == "geometry") {
            contextualColoursFolder.hide();
            materialColoursFolder.hide();
            geometryColoursFolder.show();
            for (let i=0; i<elements.length; i++) {
                if (elements[i].el_contextual != "ground") {
                    elements[i].material.color.setHex(geometry_colours[elements[i].el_geometry]);
                }
            }
        }
    }
}

export {ground_colour, contextual_colours, material_colours, geometry_colours, addColourFolders};