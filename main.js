import Vector3 from "./3D/Physics/Math3D/Vector3.mjs";
import World from "./3D/Physics/Core/World.mjs";

import SimpleCameraControls from "./3D/SimpleCameraControls.mjs";
import CameraTHREEJS from "./3D/CameraTHREEJS.mjs";
import Player from "./3D/Entity/Player.mjs"
import Keysheld from "./3D/Web/Keysheld.mjs";

import Stats from "./3D/Web/Stats.mjs";
import GraphicsEngine from "./3D/Graphics/GraphicsEngine.mjs";

import * as THREE from "three";
import EntitySystem from "./3D/Entity/EntitySystem.mjs";
import Timer from "./3D/Physics/Core/Timer.mjs";
import ParticleSystem from "./3D/Graphics/Particle/ParticleSystem.mjs";
import Particle from "./3D/Graphics/Particle/Particle.mjs";
import TextParticle from "./3D/Graphics/Particle/TextParticle.mjs";
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

graphicsEngine.setBackgroundImage("autumn_field_puresky_8k.hdr", true, false);

graphicsEngine.setSunlightDirection(new Vector3(-2, -8, -5));
graphicsEngine.setSunlightBrightness(1);
graphicsEngine.disableAO();
graphicsEngine.renderDistance = 1600;
graphicsEngine.cameraFar = 2000;
window.graphicsEngine = graphicsEngine;



var gameCamera = new CameraTHREEJS({ camera: graphicsEngine.camera, pullback: 5, maxPullback: 40 });
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

cameraControls.addKeyBinds(
    {
        ArrowUp: "forward",
        KeyW: "forward",
        ArrowDown: "backward",
        KeyS: "backward",
        ArrowLeft: "left",
        KeyA: "left",
        ArrowRight: "right",
        KeyD: "right",
        Space: "up",
        ShiftLeft: "down",
        ShiftRight: "down",
        KeyO: "zoomOut",
        KeyI: "zoomIn"
    }
);


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
world.setIterations(16);

world.graphicsEngine = graphicsEngine;

var gravity = -0.4;
var player = new Player({
    size: 1,
    moveStrength: 0.5,
    airMoveStrength: 0.2,
    moveSpeed: 0.2,
    jumpSpeed: 0.4,
    gravity: new Vector3(0, gravity, 0),
    position: new Vector3(0, 30, 0),
    mass: 1,
    graphicsEngine: graphicsEngine
});
top.player = player;
player.setMeshAndAddToScene({}, graphicsEngine);
entitySystem.register(player);
player.addToWorld(world);

var map = await graphicsEngine.loadMap("map.glb");
for (const obj of map.objects) {
    world.addComposite(obj);
    obj.addToScene(graphicsEngine.scene);
    if (obj.name.toLowerCase().includes("start")) {
        player.setStartPoint(obj.global.body.position);
        player.respawn();
    }
    if (obj.name.toLowerCase().includes("start") || obj.name.toLowerCase().includes("checkpoint")) {
        obj.addEventListener("collision", function (contact) {
            if (contact.body1.maxParent == player.getMainShape().maxParent || contact.body2.maxParent == player.getMainShape().maxParent) {
                player.setSpawnPoint(player.getMainShape().global.body.position);
            }
        })
    }
}
for (var mesh of map.meshes) {
    graphicsEngine.addToScene(mesh);
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
function render() {
    stats.begin();
    cameraControls.update();

    cameraControls.updateZoom();


    stepper.job = function () {
        player.updateKeys(cameraControls.movement, cameraControls.justToggled, cameraControls.getDelta(graphicsEngine.camera));
        cameraControls.reset();
        player.update();

        stats2.begin();
        previousWorld = world.toJSON();

        world.step();

        stats2.end();
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