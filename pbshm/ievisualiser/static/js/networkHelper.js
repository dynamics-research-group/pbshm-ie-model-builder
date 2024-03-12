import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import * as picker from './pickerHelper.js';
import { otherColours, contextualColours, addColourFolders, cElements,
         makeContextColourVisible, makeMaterialColourVisible, makeGeometryColourVisible } from './colourHelper.js';



function plotNetworkFromFile(rawtext){
    // Get information on network edges
    const data = JSON.parse(rawtext);
    const elements = data.models.irreducibleElement.elements;
    const relat  = data.models.irreducibleElement.relationships;
    const nElements = elements.length;
    // Store the edges in both directions of the bi-directional graph
    let edgeCoords = [...Array(nElements)].map(e => Array());
    let edges = [...Array(nElements)].map(e => Array());
    let elInfo = [];
    let elNames = [];
    let counts = new Array(nElements); for (let i=0; i<nElements; ++i) counts[i] = 0;
    elements.forEach((node) => {
        elNames.push(node.name);
    });
    let i1, i2, i, x, y, z;
    for (i=0; i<relat.length; i++){
        i1 = elNames.indexOf(relat[i].elements[0].name);
        i2 = elNames.indexOf(relat[i].elements[1].name);
        edges[i1].push(i2);
        edges[i2].push(i1);
        counts[i1]++;
        counts[i2]++;
        if ("coordinates" in relat[0].elements[1]){
            x = relat[i].elements[0].coordinates.global.translational.x.value;
            y = relat[i].elements[0].coordinates.global.translational.y.value;
            z = relat[i].elements[0].coordinates.global.translational.z.value;
            edgeCoords[i1].push([x, y, z])
            edgeCoords[i2].push([x, y, z])
        }
    }
    let nodeCoords;
    // See if there were any coordinates given detailing where two elements join
    let totalCoords = 0;
    for (i=0; i<edgeCoords.length; i++){
        totalCoords += edgeCoords[i].length;
    }
    for (i=0; i<elNames.length; i++){
        try {
            elInfo[i] = elements[i]
        } catch {;}  // no material type given
    }
    // If none were given then calculate where to position the nodes.
    if (totalCoords == 0){
        nodeCoords = fruchterman_reingold(edges);
        drawNetwork(nodeCoords, edges, elInfo, true)
    }
    // If joint coordinates were given then use them to decide on node coordinates
    else{
        let tempEdges = edges.map(function(arr) {
            return arr.slice();
        });
        nodeCoords = getNodeCoords(tempEdges, edgeCoords, counts);
        drawNetwork(nodeCoords, edges, elInfo);
    }
    
}

/*  Given edgeCoords (where two elements are joined),
    decide what the coordinates of the nodes should be.
    Returns an ordered list of coordinates for each node.
    
    This method takes the least popular node and uses the coordinates of
    its first known joint with another element to decide where to place the node.
    It then cycles through, looking at the next least popular node, until all
    have been considered.*/
function getNodeCoords(edges, edgeCoords, counts){
    let e1, e2;
    const nElements = edges.length;
    let nodeCoords = [...Array(nElements)].map(e => [0, 0, 0]);
    let minCount = Math.min(...counts)
    while (minCount < Infinity){
        e1 = counts.indexOf(minCount);
        e2 = edges[e1][0];
        // remove the used edge
        edges[e1].shift();  // used first edge of e1
        edges[e2].splice(edges[e2].indexOf(e1), 1);  // find and remove e1 edge in e2
        nodeCoords[e1] = edgeCoords[e1][0];
        counts[e1] -= 1;  // so it doesn't get called again
        counts[e2] -= 1;
        if (counts[e1] == 0){ counts[e1] = Infinity; }
        if (counts[e2] == 0){ counts[e2] = Infinity; }
        minCount = Math.min(...counts)
    }
    return nodeCoords;
}

function drawNetwork(coords, edges, elInfo, threeD=true){
    const nNodes = coords.length;
    let minX = 0;
    let minY = 0
    let maxX = 0;
    let maxY = 0;
    let maxZ = 0;
    // let maxX, maxY;
    coords.forEach((node) => {
        minX = Math.min(minX, node[0]);
        minY = Math.min(minY, node[1]);
        maxX = Math.max(maxX, node[0]);
        maxY = Math.max(maxY, node[1]);
        maxZ = Math.max(maxZ, node[2]);
    });

    // Scale coords to fit on the canvas
    // The canvas is (300 * 150) but scale to (200 * 100) so the nodes aren't right on the edge
    for (let i=0; i<coords.length; i++){
        const x = coords[i][0]
        const y = coords[i][1]
        coords[i][0] = ((x - minX) / (maxX - minX)) * 200 - 100
        coords[i][1] = ((y - minY) / (maxY - minY)) * 100 - 50
    }

    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({antialias: true, canvas});
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 'white' );
    let camera;
    if (threeD){
        const fov = 30;	// field of view - determines width of near and far planes
        const aspect = 2;	// the canvas default	(300 x 150)
        const near = 1;	// height of near plane
        const far = 500;	// height of far plane
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(0, 0, Math.min(300));	// where the camera is located
    }
    else{
        camera = new THREE.OrthographicCamera(-150, 150, 75, -75, -1, 1);
        camera.zoom = 1;
    }

    renderer.render( scene, camera );
    // Give the user the ability to control the camera
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);	// where the camera looks
    controls.update();

    // GUI for changing the colour scheme
	const gui = new GUI();
    addColourFolders(gui, render, "contextual");
  
    // Add ambient light because otherwise the shadow from the directional light is too dark
    const color = 0xFFFFFF;
    const intensity2 = 3;
    const light2 = new THREE.AmbientLight(color, intensity2);
    scene.add(light2);
    
    // Plot the nodes
    for (let i=0; i<nNodes; i++){
        const shape = makeInstance(new THREE.SphereGeometry(2, 12, 8),
                                    coords[i][0],
                                    coords[i][1],
                                    coords[i][2],
                                    elInfo[i]);
        cElements.push(shape);
        if (shape.el_contextual != "ground") {
			makeContextColourVisible(shape.el_contextual);
			makeMaterialColourVisible(shape.el_material);
			makeGeometryColourVisible(shape.el_geometry);
		}
    }
    
    // Plot the edges
    let pos1, pos2;
    const matLine = new LineMaterial( {
        color: 0xff0000,
        linewidth: 0.001 // in world units with size attenuation, pixels otherwise
    } );
    for (let i=0; i<nNodes; i++){
        pos1 = coords[i];
        for (let j=0; j<edges[i].length; j++){
            if (i < edges[i][j]) {  // don't draw lines twice (once for each way)
                pos2 = coords[edges[i][j]];
                drawLine(pos1, pos2)
            }
        }
    }

    // Print the name of the currently selected node
	picker.setup(scene, camera);
	picker.clearPickPosition();
    document.addEventListener('mousedown', picker.selectPickPosition, false);
    // window.addEventListener('mouseout', picker.clearPickPosition);
    // window.addEventListener('mouseleave', picker.clearPickPosition);


    
    function render() {
      if ( resizeRendererToDisplaySize( renderer ) ) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      }
      renderer.render( scene, camera );
      requestAnimationFrame( render );
    }

    function resizeRendererToDisplaySize( renderer ) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if ( needResize ) {
            renderer.setSize( width, height, false );
        }
        return needResize;
    }
    
    // Add a shape to the scene
    function makeInstance(geometry, x, y, z, info) {
        // Get contextual, material and geometry information used by colour picker
        let element_type;
        let element_material;
        let element_geom;
        if (info.type != "ground") {
            element_type = info.contextual.type;
            // Material and geometry may have two or three bits of information
            try {
                element_material = [info.material.type.name, info.material.type.type.name, info.material.type.type.type.name].join("-");
            } catch(TypeError) {
                try {
                    element_material = [info.material.type.name, info.material.type.type.name].join("-");
                } catch(TypeError) {
                    element_material = info.material.type.name;
                }
            }
            try {
                element_geom = [info.geometry.type.name, info.geometry.type.type.name, info.geometry.type.type.type.name].join(" ");
            } catch(TypeError) {
                element_geom = [info.geometry.type.name, info.geometry.type.type.name].join(" ");
            }
        } else {
            element_type = "ground";
        }
        let colour;
        if (element_type == "ground"){
            colour = otherColours["ground"];
        } else {
            colour = contextualColours[element_type];
        }
        const material = new THREE.MeshPhongMaterial({color: colour});
        const shape = new THREE.Mesh(geometry, material);
        shape.name = info['name'];
        shape.full_info = info;
        shape.el_material = element_material;
        shape.el_contextual = element_type;
        shape.el_geometry = element_geom;
        shape.position.x = x;
        shape.position.y = y;
        shape.position.z = z;
        scene.add(shape);
        return shape;
    }
    
    function drawLine(pos1, pos2){
      const geometry = new LineGeometry();
      geometry.setPositions([pos1[0], pos1[1], pos1[2], pos2[0], pos2[1], pos2[2]]);
      scene.add(new Line2( geometry, matLine ));
    }
    
    requestAnimationFrame(render);
}



/* Decide on the coordinates of the nodes given a list of edges
Edges is a list of lists. Each row is a node and each element in a
row lists the indexes of the edges shared with the node.
Using method detailed in
    Fruchterman, Thomas MJ, and Edward M. Reingold.
    "Graph drawing by force‐directed placement."
    Software: Practice and experience 21, no. 11 (1991): 1129-1164.
*/
function fruchterman_reingold(edges, iterations=50, scale=1){
    function makeArray(w, h, val) {
        var arr = [];
        for(let i = 0; i < h; i++) {
            arr[i] = [];
            for(let j = 0; j < w; j++) {
                arr[i][j] = val;
            }
        }
        return arr;
    }
	const dimens = 3;
	const nVertices = edges.length;
	const k = Math.sqrt(1 / nVertices);  // Optimal distance between nodes
	
	// Create the adjacency matrix
	let A = makeArray(nVertices, nVertices, 0);
	let i;
	for (i=0; i<nVertices; i++){
		for (const e of edges[i]){
			A[i][e] = 1;
			A[e][i] = 1;
		}
	}

	// Create random initial positions
	let pos = [];
	for (let i = 0; i < nVertices; i++) {
        pos[i] = [];
        for (let j = 0; j < dimens; j++) {
			pos[i][j] = Math.random();
        }
    }
	
	// Set initial temperature
	const arrayColumn = (arr, n) => arr.map(x => x[n]);  // to get a column of an array
	let t = Math.max((Math.max.apply(Math, arrayColumn(pos, 0)) - Math.min.apply(Math, arrayColumn(pos, 0))),
	                 (Math.max.apply(Math, arrayColumn(pos, 1)) - Math.min.apply(Math, arrayColumn(pos, 1))));
	const dt = t / (iterations + 1);

	let displacement = makeArray(dimens, nVertices, 0);
	let delta, dist, dx, dy;
	let length, delta_pos;
	for (let iter=0; iter<iterations; iter++){
		// reset displacement
		for (let i = 0; i < nVertices; i++) {
			for (let j = 0; j < dimens; j++) {
				displacement[i][j] = 0;
			}
		}
		
		for (i=0; i<nVertices; i++){
			// Get the euclidean distance between this node's position and all others
			delta = makeArray(2, nVertices, 0);
			dist = [];
			for (let j=0; j<nVertices; j++){
				delta[j][0] = pos[i][0] - pos[j][0];
				delta[j][1] = pos[i][1] - pos[j][1];
				dist[j] = Math.sqrt(delta[j][0]**2 + delta[j][1]**2);
				// Enforce minimum distance of 0.01
				if (dist[j] < 0.01){
					dist[j] = 0.01;
				}
			}
			// Get the displacement force and sum for each separate axis
			dx = 0;
			dy = 0;
			for (let j=0; j<nVertices; j++){
				dx += delta[j][0] * (k * k / dist[j]**2 - A[i][j] * dist[j] / k)
				dy += delta[j][1] * (k * k / dist[j]**2 - A[i][j] * dist[j] / k)
			}
			displacement[i][0] = dx;
			displacement[i][1] = dy;
		}
		
		// Update positions
		for (i=0; i<nVertices; i++){
			length = Math.sqrt(displacement[i][0]**2 + displacement[i][1]**2);
			if (length < 0.01){
				length = 0.01;
			}
			delta_pos = [displacement[i][0] * t / length, displacement[i][1] * t / length];
			pos[i][0] += delta_pos[0]
			pos[i][1] += delta_pos[1]
		}

		// Cool temperature
		t -= dt;
	}

	// // Rescale
	let meanX = 0;
	let meanY = 0;
	for (i=0; i<nVertices; i++){
		meanX += pos[i][0];
		meanY += pos[i][1];
	}
	meanX /= nVertices;
	meanY /= nVertices;
	for (i=0; i<nVertices; i++){
		pos[i][0] -= meanX;
		pos[i][1] -= meanY;
	}
	
	
	return pos;

}



export {plotNetworkFromFile};
