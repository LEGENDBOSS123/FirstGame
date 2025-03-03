import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';



var AutoTextureLoader = class {
    constructor(options) {
        this.specialLoaders = {
            "glb": GLTFLoader,
            "gltf": GLTFLoader,
            "exr": EXRLoader,
            "hdr": RGBELoader
        }
    }

    async load(url) {
        var extension = url.split('.').pop().toLowerCase();
        if (this.specialLoaders[extension]) {
            var loader = new this.specialLoaders[extension];
            return loader.loadAsync(url);
        }
        return new THREE.TextureLoader().loadAsync(url);
    }
}


export default AutoTextureLoader;