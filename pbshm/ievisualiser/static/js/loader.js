import * as THREE from 'three';
import {plotNetworkFromFile} from './networkHelper.js';
import { plotModel } from './ieHelper.js';
import { extractShapes } from './jsonHelper.js';
import { buildModel } from './builder.js';

export function loadFile(filepath, purpose='viewer'){
	const loader = new THREE.FileLoader();
  console.log(filepath)
  console.log(purpose)
  loader.load(
      filepath,

      // onLoad callback
      function ( data ) {
        // output the text to the console
        const shapes = extractShapes(data);
        if (shapes.length > 0){
          if (purpose == 'viewer') {
            plotModel(shapes);
          } else {
            buildModel(shapes);
          }
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