import * as THREE from 'three';
import {plotNetworkFromFile} from './networkHelper.js';
import { extractShapes, plotIE } from './ieHelper.js';



function loadFile(filepath){
	const loader = new THREE.FileLoader();
  loader.load(
      filepath,

      // onLoad callback
      function ( data ) {
        // output the text to the console
        const shapes = extractShapes(data);
        if (shapes.length > 0){
          plotIE(shapes);
        }
        else {
          plotNetworkFromFile(data);
        }
      },

      // onProgress callback
      function ( xhr ) {
        console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      },

      // onError callback
      function ( err ) {
        console.error( 'An error happened' );
      }
    );
}



loadFile('ie_models/slab-bridge-148-4-span-1-columns.json');
//loadFile('ie_models/hawk-form-no-measurements.json');
//loadFile('ie_models/humber-no-measurements.json');