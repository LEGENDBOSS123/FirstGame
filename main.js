import Vector3 from "./3D/Physics/Math3D/Vector3.mjs";
import Matrix3 from "./3D/Physics/Math3D/Matrix3.mjs";
import Hitbox3 from "./3D/Physics/Broadphase/Hitbox3.mjs";
import Quaternion from "./3D/Physics/Math3D/Quaternion.mjs";
import Triangle from "./3D/Physics/Shapes/Triangle.mjs";
import PhysicsBody3 from "./3D/Physics/Core/PhysicsBody3.mjs";
import Material from "./3D/Physics/Collision/Material.mjs";
import Composite from "./3D/Physics/Shapes/Composite.mjs";
import Sphere from "./3D/Physics/Shapes/Sphere.mjs";
import Box from "./3D/Physics/Shapes/Box.mjs";
import Polyhedron from "./3D/Physics/Shapes/Polyhedron.mjs";
import Point from "./3D/Physics/Shapes/Point.mjs";
import Terrain3 from "./3D/Physics/Shapes/Terrain3.mjs";
import SpatialHash from "./3D/Physics/Broadphase/SpatialHash.mjs";
import World from "./3D/Physics/Core/World.mjs";
import CollisionContact from "./3D/Physics/Collision/CollisionContact.mjs";
import CollisionDetector from "./3D/Physics/Collision/CollisionDetector.mjs";
import SimpleCameraControls from "./3D/SimpleCameraControls.mjs";
import CameraTHREEJS from "./3D/CameraTHREEJS.mjs";
import Player from "./Player.mjs";
import Keysheld from "./3D/Web/Keysheld.mjs";

import Stats from "./3D/Web/Stats.mjs";
import GraphicsEngine from "./3D/Graphics/GraphicsEngine.mjs";

import * as THREE from "three";
import Target from "./Target.mjs";
import EntitySystem from "./EntitySystem.mjs";
import Timer from "./Timer.mjs";
import ParticleSystem from "./ParticleSystem.mjs";
import Particle from "./Particle.mjs";
import TextParticle from "./TextParticle.mjs";
import DistanceConstraint from "./3D/Physics/Collision/DistanceConstraint.mjs";
var stats = new Stats();
var stats2 = new Stats();

stats.showPanel(0);
document.body.appendChild(stats.dom);

stats2.showPanel(0);
stats2.dom.style.left = "85px";
document.body.appendChild(stats2.dom);

var graphicsEngine = new GraphicsEngine({
    window: window,
    document: document,
    container: document.body,
    canvas: document.getElementById("canvas"),
});

graphicsEngine.ambientLight.intensity = 1;

graphicsEngine.setBackgroundImage("3D/Graphics/Textures/autumn_field_puresky_8k.hdr", true, false);

graphicsEngine.setSunlightDirection(new Vector3(-2, -8, -5));
graphicsEngine.setSunlightBrightness(1);
graphicsEngine.disableAO();
graphicsEngine.disableShadows();

graphicsEngine.renderDistance = 2048;
graphicsEngine.cameraFar = 4096;
window.graphicsEngine = graphicsEngine;



top.gameCamera = new CameraTHREEJS({ camera: graphicsEngine.camera, pullback: 5, maxPullback: 40});
var cameraControls = new SimpleCameraControls({
    camera: gameCamera,
    speed: 1,
    pullbackRate: 0.2,
    rotateMethods: {
        wheel: true,
        shiftLock: true,
        drag: true
    },
    rotateSensitivity: {
        wheel: 0.01,
        shiftLock: 0.01,
        drag: 0.01
    },
    shiftLockCursor: document.getElementById('shiftlockcursor'),
    window: window,
    document: document,
    renderDomElement: document.body
});


var keyListener = new Keysheld(window);



document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

window.addEventListener('keydown', function (e) {
    if (e.key == "r") {
        player.respawn();
        return;
    }
});



var world = new World();
var entitySystem = new EntitySystem();

top.world = world;
top.entitySystem = entitySystem;

world.setSubsteps(4);
world.graphicsEngine = graphicsEngine;

var gravity = -0.5;
for (var i = 0; i < 1; i++) {
    var player = new Player({
        radius: 1,
        moveStrength: 0.5,
        airMoveStrength: 0.1,
        moveSpeed: 0.5,
        jumpSpeed: 0.8,
        gravity: new Vector3(0, gravity, 0),
        position: new Vector3(0, 30, 0),
        mass: 1,
        graphicsEngine: graphicsEngine
    });
    top.player = player;
    player.setMeshAndAddToScene({}, graphicsEngine);
    entitySystem.register(player);
    player.addToWorld(world);

}


var addParticle = function (position, damage) {
    var particle = new TextParticle({
        position: position.add(new Vector3(0, 3, 0)),
        duration: 1250,
        swaySpeed: 0.01,
        size: Math.max(-0.25 + damage * 0.1, 0.5),
        swayStrength: Math.min(-0.1 + damage * 0.01, 0.8),
        text: "-" + damage.toString(),
        color: "rgb(200, 36, 21)",
        velocity: new Vector3(0, 0.006, 0),
        damping: 0.005,
        fadeOutSpeed: 0.2,
        fadeInSpeed: 0.2,
        growthSpeed: 0.2,
        shrinkSpeed: 0.2,
    });
    particleSystem.addParticle(particle);
}

top.addParticle = addParticle;


for (var i = 0; i < 1; i++) {
    graphicsEngine.load('ground.glb', function (gltf) {
        gltf.scene.castShadow = true;
        gltf.scene.receiveShadow = true;
        gltf.scene.traverse(function (child) {
            child = child.clone();
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.isMesh) {
                child.material.depthWrite = true;

            }
            if (child.isMesh) {
                var poly = new Polyhedron({ local: { body: { mass: 1 } } }).fromMesh(child, graphicsEngine);
                poly.setRestitution(0);
                poly.setFriction(0);
                poly.mesh = graphicsEngine.meshLinker.createMeshData(child);
                poly.addToScene(graphicsEngine.scene);
                poly.setLocalFlag(Composite.FLAGS.STATIC, true);
                top.e = child;
                world.addComposite(poly);
                top.poly = poly;
            }

        });
        player.respawn();
    });
}



var fps = 20;
var previousWorld = 0;

var timer = new Timer();
var stepper = new Timer.Interval(1000 / fps);
timer.schedule(stepper);
var particleSystem = new ParticleSystem({
    timer: timer,
    graphicsEngine: graphicsEngine
})
top.particleSystem = particleSystem;
function render() {
    stats.begin();
    if (keyListener.isHeld("ArrowUp") || keyListener.isHeld("KeyW")) {

        cameraControls.forward();
    }
    if (keyListener.isHeld("ArrowDown") || keyListener.isHeld("KeyS")) {
        cameraControls.backward();
    }
    if (keyListener.isHeld("ArrowLeft") || keyListener.isHeld("KeyA")) {
        cameraControls.left();
    }
    if (keyListener.isHeld("ArrowRight") || keyListener.isHeld("KeyD")) {
        cameraControls.right();
    }
    if (keyListener.isHeld("Space")) {
        cameraControls.up();
    }
    if (keyListener.isHeld("ShiftLeft") || keyListener.isHeld("ShiftRight")) {
        cameraControls.down();
    }
    if (keyListener.isHeld("KeyO")) {
        cameraControls.zoomOut();
    }
    if (keyListener.isHeld("KeyI")) {
        cameraControls.zoomIn();
    }
    //player.updateHealthTexture(player.composite.mesh, graphicsEngine);
    
    cameraControls.updateZoom();


    stepper.job = function () {
        stats2.begin();
        previousWorld = world.toJSON();
        top.previousWorld = previousWorld;

        world.step();

        stats2.end();


        player.updateKeys(cameraControls.movement, cameraControls.justToggled, cameraControls.getDelta(graphicsEngine.camera));
        cameraControls.reset();
        player.update();
        

    }

    graphicsEngine.update(previousWorld || world, world, stepper.getLerpAmount());
    gameCamera.update(Vector3.from(player.getMainShape()?.mesh?.mesh?.position));
    particleSystem.update();
    graphicsEngine.render();
    timer.step();
    requestAnimationFrame(render);

    stats.end();
}


render();