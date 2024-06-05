import * as THREE from 'three';
import {plotNetworkFromFile} from './networkHelper.js';
import { plotModel } from './viewer.js';
import { modelInfo, extractShapes, extractRelationships } from './jsonHelper.js';
import { buildModel } from './builder.js';
import  * as gui from './guiHelper.js';


export function loadFile(filepath, purpose='viewer', saveUrl=''){
	const loader = new THREE.FileLoader();
  loader.load(
      filepath,

      // onLoad callback
      function ( data ) {
        // output the text to the console
        const info = modelInfo(data);
        gui.modelDetailsFolder.children[gui.modelIdx.name].setValue(info.name);
        gui.modelDetailsFolder.children[gui.modelIdx.desc].setValue(info.description);
        gui.modelDetailsFolder.children[gui.modelIdx.pop].setValue(info.population);
        gui.modelDetailsFolder.children[gui.modelIdx.type].setValue(info.type);
        const shapes = extractShapes(data);
        if (shapes.length > 0){
          if (purpose == 'viewer') {
            plotModel(shapes);
          } else {
            const [relationships, natures] = extractRelationships(data);
            buildModel(saveUrl, shapes, relationships, natures);
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