const contextual_colours = {"slab":0xa96645, "column":0x58C2EB, "beam":0x7b6bb0,
                 "block":0x783372, "cable":0x71c1fe, "wall":0x5363cc,
                 "ground": 0xaaaaaa, "plate":0xd1dfb9, "deck":0xe59bc1,
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
                          "shell-translate-sphere": 0x8DB600,
                          "shell-translate-cylinder": 0x7BA05B,
                          "shell-translate-other": 0x568203,
                          "solid-translateAndScale-cuboid": 0x800020,
                          "solid-translateAndScale-cylinder": 0xFDBCB4,
                          "solid-translateAndScale-other": 0xC51E3A,
                          "shell-translateAndScale-cuboid": 0x004225,
                          "shell-translateAndScale-cylinder": 0xACE1AF,
                          "shell-translateAndScale-other": 0xADFF2F};


export {contextual_colours, material_colours, geometry_colours};