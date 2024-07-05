import * as THREE from 'three';

import {plotNetworkFromFile} from './networkHelper.js';
import { plotModel } from './viewer.js';
import { modelInfo, extractShapes, extractRelationships } from './jsonHelper.js';
import { buildModel } from './builder.js';
import  * as gui from './guiHelper.js';


/**
 * Load the json file of a model.
 * @param {string} filepath Where the json file is stored.
 * @param {string} purpose If the user intends to user the model "viewer" (default) or "builder".
 * @param {string} saveUrl The url required for the POST request to save the model if using the builder.
 */
export function loadFile(filepath, purpose='viewer', saveUrl=''){
	const loader = new THREE.FileLoader();
  loader.load(
      filepath,

      // onLoad callback
      function ( data ) {
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
        console.error( err );
      }
    );
}