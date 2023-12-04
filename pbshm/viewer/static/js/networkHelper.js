import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';

import { colours} from './globals.js';
import * as picker from './pickerHelper.js';



function plotNetworkFromFile(rawtext){
    // Get information on network edges
    const data = JSON.parse(rawtext);
    const elements = data.models.irreducibleElement.elements;
    const relat  = data.models.irreducibleElement.relationships;
    const nElements = elements.length;
    // Store the edges in both directions of the bi-directional graph
    let edgeCoords = [...Array(nElements)].map(e => Array());
    let edges = [...Array(nElements)].map(e => Array());
    let elNames = [];
    let elTypes = [];
    let counts = new Array(nElements); for (let i=0; i<nElements; ++i) counts[i] = 0;
    elements.forEach((node) => {
        elNames.push(node.name);
        if (node.type == "regular"){
            elTypes.push(node.contextual.type)
        }
        else {
            elTypes.push(node.type)  // if not regular then it's the ground
        }
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
            elNames[i] = [elNames[i], elements[i].material.type.name, elements[i].material.type.type.name].join(" ");
        } catch {;}  // no material type given
    }
    // If none were given then calculate where to position the nodes.
    if (totalCoords == 0){
        nodeCoords = positionNodes(edges);
        drawNetwork(nodeCoords, edges, elTypes, elNames, true)
    }
    // If joint coordinates were given then use them to decide on node coordinates
    else{
        let tempEdges = edges.map(function(arr) {
            return arr.slice();
        });
        nodeCoords = getNodeCoords(tempEdges, edgeCoords, counts);
        drawNetwork(nodeCoords, edges, elTypes, elNames);
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

function drawNetwork(coords, edges, elTypes, elNames, threeD=true){
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
  
    // Add ambient light because otherwise the shadow from the directional light is too dark
    const color = 0xFFFFFF;
    const intensity2 = 1;
    const light2 = new THREE.AmbientLight(color, intensity2);
    scene.add(light2);
    
    // Plot the nodes
    for (let i=0; i<nNodes; i++){
        makeInstance(new THREE.SphereGeometry(1, 12, 8),
                     colours[elTypes[i]],
                     coords[i][0],
                     coords[i][1],
                     coords[i][2],
                     elNames[i]);
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
    window.addEventListener('mouseout', picker.clearPickPosition);
    window.addEventListener('mouseleave', picker.clearPickPosition);

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
    function makeInstance(geometry, color, x, y, z, name) {
      const material = new THREE.MeshPhongMaterial({color});
      const shape = new THREE.Mesh(geometry, material);
      shape.name = name;
      scene.add(shape);
      shape.position.x = x;
      shape.position.y = y;
      shape.position.z = z;
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
Algorithm for calculating the coordinates is taken from:
M J McGuffin, Simple algorithms for network visualisation: A tutorial,
Tsinghua Science and Technology, 2012. */
function positionNodes(edges){
    const L = 10;  // spring rest length
    const Kr = 100;  // respulsive force constant
    const Ks = 5;  // spring constant
    const deltaT = 0.005  // time step
    
    const nNodes = edges.length;
    let coords = [];

    // First, generate coordinates for a cicular layout
    const jump = 1/nNodes;
	let theta;
	for (let i=0; i<nNodes; i++){
		theta = i * jump * 2 * Math.PI;
		coords.push([Math.cos(theta), Math.sin(theta), 0])
    }
    
    let i, j, i1, i2, dx, dy, distance, force, fx, fy, distanceSquared;

    // Initialise net forces
    let forcesX = [];
    let forcesY = [];
    for (i=0; i<nNodes; i++){
        forcesX.push(0)
        forcesY.push(0)
    }

    let attempt = 1;
    //while (checkIntersections(edges, coords)){  // if you want to make sure there are no unwanted intersections
    while (attempt < 50){
        // repulsion between all pairs 
        for (i1=0; i1<nNodes-1; i1++){
            for (i2=i1+1; i2<nNodes; i2++){
                dx = coords[i2][0] - coords[i1][0]
                dy = coords[i2][1] - coords[i1][1]
                if (dx != 0 || dy != 0){
                distanceSquared = (dx*dx) + (dy*dy);
                distance = Math.sqrt(distanceSquared);
                force = Kr / distanceSquared;
                fx = force * dx / distance;
                fy = force * dy / distance;
                forcesX[i1] -= fx;
                forcesY[i1] -= fy;
                forcesX[i2] += fx;
                forcesY[i2] += fy;
                }
            }
        }

        // sprint force between adjacent pairs
        for (i1=0; i1<nNodes; i1++){
            for (j=0; j<edges[i1].length; j++){
                i2 = edges[i1][j];
                if (i1 < i2) { // avoid dealing with pairs twice
                    dx = coords[i2][0] - coords[i1][0]
                    dy = coords[i2][1] - coords[i1][1]
                    if (dx != 0 || dy != 0){
                        distance = Math.sqrt((dx*dx) + (dy*dy));
                        force = Ks * (distance - L);
                        fx = force * dx / distance;
                        fy = force * dy / distance;
                        forcesX[i1] += fx;  // can you do -= notation here?
                        forcesY[i1] += fy;
                        forcesX[i2] -= fx;
                        forcesY[i2] -= fy;
                    }
                }
            }
        }

        // update positions
        for (i=0; i<nNodes; i++){
            dx = deltaT * forcesX[i];
            dy = deltaT * forcesY[i];
            coords[i][0] = coords[i][0] + dx;
            coords[i][1] = coords[i][1] + dy;
        }
    attempt++;
    }
    
    return coords;
}

/* Use this if you want to make sure no edges intersect with a node they shouldn't or with another edge */
function checkIntersections(edges, coords){
    const nNodes = edges.length;
    const radius = 5;

    let minX = 0;
    let minY = 0
    let maxX = 0;
    let maxY = 0;
    coords.forEach((node) => {
        minX = Math.min(minX, node[0]);
        minY = Math.min(minY, node[1]);
        maxX = Math.max(maxX, node[0]);
        maxY = Math.max(maxY, node[1]);
    });

    // Scale coords to fit on the canvas
    // The canvas is (300 * 150) but scale to (200 * 100) so the nodes aren't right on the edge
    for (let i=0; i<coords.length; i++){
        const x = coords[i][0]
        const y = coords[i][1]
        coords[i][0] = ((x - minX) / (maxX - minX)) * 200 - 100
        coords[i][1] = ((y - minY) / (maxY - minY)) * 100 - 50
    }

    // Check that an edge doesn't intersect with a node not related to the edge
    let pos1, pos2, j, i1, i2, i3, x, y, dist;
    let edge_pairs = [];  // list of edges
    for (i1=0; i1<nNodes; i1++){  // node 1 of edge
        pos1 = coords[i1];
        for (j=0; j<edges[i1].length; j++){
            i2 = edges[i1][j];  // node 2 of edge
            if (i1 < i2) { // don't calculate for the edge twice
                pos2 = coords[i2];
                edge_pairs.push([pos1, pos2]);
                // Find the equation of the line for the edge
                const a = pos2[1] - pos1[1];
                const b = pos1[0] - pos2[0];
                const c = pos1[1] * (pos2[0] - pos1[0]) - (pos2[1] - pos1[1]) * pos1[0];
                for (i3=0; i3<nNodes; i3++){  // node 3 tested for intersection
                    if (i3 != i1 && i3 != i2){  // don't check for the nodes used by the edge
                        // Check that the edge of nodes i1 and i2 doesn't intersect through node i3
                        x = coords[i3][0];
                        y = coords[i3][1];
                        dist = (Math.abs(a * x + b * y + c)) / 
                                Math.sqrt(a * a + b * b);
                        if (radius >= dist){
                            return true;  // They intersect!
                        }
                    }
                }
            }
        }
    }

    // Check if two edges intersect
    // Using maths from https://bryceboe.com/2006/10/23/line-segment-intersection-algorithm/
    // The two edges are defined by endpoints ab and cd
    let a, b, c, d;
    for (i1=0; i1<edge_pairs.length-1; i1++){
        for (i2=i1+1; i2<edge_pairs.length; i2++){
            a = edge_pairs[i1][0];
            b = edge_pairs[i1][1];
            c = edge_pairs[i2][0];
            d = edge_pairs[i2][1];
            if (a != d && b != c){
                if (ccw(a, c, d) != ccw(b, c, d) && ccw(a, b, c) != ccw(a, b, d) ){
                    return true;  // They intersect!
                }
            }
        }
    }

    function ccw(a, b, c){
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    }
    return false;  // No intersections found
}



export {plotNetworkFromFile};
