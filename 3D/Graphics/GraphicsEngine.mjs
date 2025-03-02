import * as THREE from "three";
import { EffectComposer, RenderPass, ShaderPass, CopyPass, EffectPass, DepthEffect } from "postprocessing";
import { N8AOPostPass } from './N8AO.mjs';
import AutoTextureLoader from "./AutoTextureLoader.mjs";
import MeshLinker from "./MeshLinker.mjs";
import Vector3 from "../Physics/Math3D/Vector3.mjs";
import Composite from "../Physics/Shapes/Composite.mjs";
import Box from "../Physics/Shapes/Box.mjs";
import Sphere from "../Physics/Shapes/Sphere.mjs";
import Polyhedron from "../Physics/Shapes/Polyhedron.mjs";
var GraphicsEngine = class {
    constructor(options) {
        this.THREE = THREE;
        this.window = options?.window ?? window;
        this.document = options?.document ?? document;

        this.container = options?.canvas?.parent ?? this.document.body;
        this.renderer = new THREE.WebGLRenderer({
            canvas: options?.canvas ?? null
        });

        this.canvas = this.renderer.domElement;

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;

        this.screenWidth = this.container.clientWidth;
        this.screenHeight = this.container.clientHeight;

        var resizeObserver = new ResizeObserver(function () {
            this.screenWidth = this.container.clientWidth;
            this.screenHeight = this.container.clientHeight;
            this.updateScreenSize();
        }.bind(this));
        resizeObserver.observe(this.container);

        this.meshLinker = new MeshLinker();

        this.scene = new THREE.Scene();
        this.renderDistance = options?.renderDistance ?? 4096;
        this.camera = new THREE.PerspectiveCamera(options?.camera?.fov ?? 90, this.aspectRatio(), options?.camera?.near ?? 0.1, options?.cameraFar ?? options?.camera?.far ?? this.renderDistance);
        this.fog = new THREE.Fog(0xFFFFFF);
        this.fogRatio = options?.fogRatio ?? 0.9;
        this.scene.fog = this.fog;
        this.scene.add(this.camera);

        this.textureLoader = new AutoTextureLoader();
        this.mixers = [];
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.renderPass.renderToScreen = false;
        this.composer.addPass(this.renderPass);

        this.n8aoPass = new N8AOPostPass(this.scene, this.camera, this.screenWidth, this.screenHeight);
        this.n8aoPass.configuration.aoRadius = 1;
        this.n8aoPass.renderToScreen = false;
        this.composer.addPass(this.n8aoPass);
        this.lights = [];
        this.setupLights();

        this.updateScreenSize();

        this.copyPass = new CopyPass();
        this.composer.addPass(this.copyPass);

        this.startTime = null;

        this.mousePosition = new Vector3(0, 0, 0);
        this.raycaster = new THREE.Raycaster();

        this.window.addEventListener("mousemove", function (event) {
            this.mousePosition.x = (event.clientX / this.screenWidth) * 2 - 1;
            this.mousePosition.y = -(event.clientY / this.screenHeight) * 2 + 1;
        }.bind(this));

    }

    raycastFirst() {
        this.raycaster.setFromCamera(this.mousePosition, this.camera);
        const intesections = this.raycaster.intersectObjects(this.scene.children, true);
        for (var i of intesections) {
            if (i.face == null && !i.normal) {
                continue;
            }
            return i;
        }
        return null;
    }

    set cameraFar(far) {
        this.camera.far = far;
    }

    get cameraFar() {
        return this.camera.far;
    }

    updateScreenSize() {
        this.renderer.setSize(this.screenWidth, this.screenHeight);
        this.composer.setSize(this.screenWidth, this.screenHeight);
        this.camera.aspect = this.aspectRatio();
        this.camera.updateProjectionMatrix();
    }

    aspectRatio() {
        return this.screenWidth / this.screenHeight;
    }

    update(previousWorld, world, lerpAmount) {
        if (!this.startTime) {
            this.startTime = performance.now();
        }
        this.meshLinker.update(previousWorld, world, lerpAmount);
    }
    render() {
        for (const mixer of this.mixers) {
            mixer.update(16 / 1000)
        }
        this.sunlight.position.copy(this.camera.position);
        this.sunlight.position.sub(this.sunlight.direction.clone().multiplyScalar(this.sunlight.shadow.camera.far * 0.5));
        this.sunlight.target.position.addVectors(this.sunlight.position, this.sunlight.direction);
        this.fog.near = this.renderDistance * this.fogRatio;
        this.fog.far = this.renderDistance;
        this.composer.render();
    }

    createAnimations(model, animations) {
        const mixer = new this.THREE.AnimationMixer(model);
        const actions = [];
        for (const animation of animations) {
            actions.push(mixer.clipAction(animation));
        }
        this.mixers.push(mixer);
        return {
            mixer: mixer,
            actions: actions
        }
    }

    setBackgroundImage(url, setBackground = true, setEnvironment = false) {
        this.textureLoader.load(url).then(function (texture, extension) {
            var pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            pmremGenerator.compileEquirectangularShader();
            texture = pmremGenerator.fromEquirectangular(texture).texture;
            pmremGenerator.dispose();

            if (setBackground) {
                this.scene.background = texture;
            }

            if (setEnvironment) {
                this.scene.environment = texture;
            }

            texture.dispose();

        }.bind(this));
    }

    setupLights() {

        this.ambientLight = new THREE.AmbientLight(0xbbbbbb, 2);
        this.scene.add(this.ambientLight);

        var range = 256;

        this.sunlight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunlight.direction = new THREE.Vector3(0, -1, 0);
        this.sunlight.castShadow = true;
        this.sunlight.shadow.mapSize.width = 4096;
        this.sunlight.shadow.mapSize.height = 4096;
        this.sunlight.shadow.camera.near = 0.1;
        this.sunlight.shadow.camera.far = 4096;
        this.sunlight.shadow.camera.left = -range;
        this.sunlight.shadow.camera.right = range;
        this.sunlight.shadow.camera.top = range;
        this.sunlight.shadow.camera.bottom = -range;
        this.sunlight.shadow.bias = -0.00001;
        this.scene.add(this.sunlight);
        this.scene.add(this.sunlight.target);

        this.lights.push(this.sunlight);

    }

    setSunlightDirection(direction) {
        this.sunlight.direction = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    }

    setSunlightBrightness(brightness) {
        this.sunlight.intensity = brightness;
    }

    disableSunlight() {
        this.sunlight.visible = false;
    }

    enableSunlight() {
        this.sunlight.visible = true;
    }


    addToScene(object) {
        this.scene.add(object);
    }


    async load(url, onLoad, onProgress, onError) {
        return this.textureLoader.load(url, onLoad, onProgress, onError);
    }

    async loadMap(url) {
        const map = { objects: [], meshes: [] };
        const traverse = function (child, colliderParsed) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.depthWrite = true;
                if (!colliderParsed) {
                    var invalidShape = false;
                    var shape = Composite;
                    if (child.name.startsWith("Box")) {
                        shape = Box;
                    }
                    else if (child.name.startsWith("Sphere")) {
                        shape = Sphere;
                    }
                    else if (child.name.startsWith("Poly")) {
                        shape = Polyhedron;
                    }
                    else {
                        map.meshes.push(child);
                        invalidShape = true;
                    }

                    if (!invalidShape) {
                        var obj = new shape().fromMesh(child, this);
                        obj.mesh = this.meshLinker.createMeshData(child);
                        //obj.setMesh({}, graphicsEngine);
                        obj.setLocalFlag(Composite.FLAGS.STATIC, true);
                        map.objects.push(obj);
                    }

                    colliderParsed = true;
                }
            }
            for (const c of child.children) {
                traverse(c, colliderParsed);
            }
        }.bind(this);
        var gltf = await this.textureLoader.load(url);
        traverse(gltf.scene);
        return map;
    }

    enableAO() {
        this.n8aoPass.enabled = true;
    }

    disableAO() {
        this.n8aoPass.enabled = false;
    }

    disableShadows() {
        this.renderer.shadowMap.enabled = false;
    }

    enableShadows() {
        this.renderer.shadowMap.enabled = true;
    }
}



export default GraphicsEngine;