import Vector3 from "./3D/Physics/Math3D/Vector3.mjs";
import World from "./3D/Physics/Core/World.mjs";

import SimpleCameraControls from "./3D/SimpleCameraControls.mjs";
import CameraTHREEJS from "./3D/CameraTHREEJS.mjs";
import Player from "./3D/Entity/Player.mjs"

import Stats from "./3D/Web/Stats.mjs";
import GraphicsEngine from "./3D/Graphics/GraphicsEngine.mjs";

import * as THREE from "three";
import EntitySystem from "./3D/Entity/EntitySystem.mjs";
import Timer from "./3D/Physics/Core/Timer.mjs";
import ParticleSystem from "./3D/Graphics/Particle/ParticleSystem.mjs";
import Particle from "./3D/Graphics/Particle/Particle.mjs";
import TextParticle from "./3D/Graphics/Particle/TextParticle.mjs";
import DistanceConstraint from "./3D/Physics/Collision/DistanceConstraint.mjs";
import GameEngine from "./3D/GameEngine.mjs";
import Sphere from "./3D/Physics/Shapes/Sphere.mjs";

var stats = new Stats();
var stats2 = new Stats();

stats.showPanel(0);
document.body.appendChild(stats.dom);

stats2.showPanel(0);
stats2.dom.style.left = "85px";
document.body.appendChild(stats2.dom);

document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

window.addEventListener('keydown', function (e) {
    if (e.key == "r") {
        player.respawn();
        return;
    }
});



var gameEngine = new GameEngine(
    {
        graphicsEngine: {
            window: window,
            document: document,
            container: document.body,
            canvas: document.getElementById("canvas")
        },
        gameCamera: {
            pullback: 0,
            maxPullback: 10
        },
        cameraControls: {
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
        },
        particleSystem: {}

    }
);
window.gameEngine = gameEngine;


gameEngine.graphicsEngine.ambientLight.intensity = 1;
gameEngine.graphicsEngine.setBackgroundImage("autumn_field_puresky_8k.hdr", true, false);
gameEngine.graphicsEngine.setSunlightDirection(new Vector3(-2, -8, -5));
gameEngine.graphicsEngine.setSunlightBrightness(1);
gameEngine.graphicsEngine.disableAO();
gameEngine.graphicsEngine.renderDistance = 1600;
gameEngine.graphicsEngine.cameraFar = 2000;


gameEngine.cameraControls.addKeyBinds(
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

gameEngine.world.setSubsteps(4);
gameEngine.world.setIterations(16);

var gravity = -0.4;
var player = new Player({
    radius: 0.5,
    height: 4,
    tiltable: false,
    moveStrength: 0.5,
    airMoveStrength: 0.1,
    moveSpeed: 0.2,
    jumpSpeed: 0.4,
    gravity: new Vector3(0, gravity, 0),
    position: new Vector3(0, 30, 0),
    mass: 1,
    graphicsEngine: gameEngine.graphicsEngine
});



player.setMeshAndAddToScene({}, gameEngine);
gameEngine.entitySystem.register(player);
player.addToWorld(gameEngine.world);




var map = await gameEngine.loadMap("map.glb", {});

for (const obj of map.objects) {
    gameEngine.world.addComposite(obj);
    obj.addToScene(gameEngine);
    if (obj.name.toLowerCase().includes("death")) {
        obj.addEventListener("collision", function (contact) {
            var player = null;
            if(gameEngine.entitySystem.getEntityFromShape(contact.body1) instanceof Player){
                player = gameEngine.entitySystem.getEntityFromShape(contact.body1);
            }
            else if(gameEngine.entitySystem.getEntityFromShape(contact.body2) instanceof Player){
                player = gameEngine.entitySystem.getEntityFromShape(contact.body2);
            }

            if(!player){
                return;
            }
            player.respawn();
        })
    }
    if (obj.name.toLowerCase().includes("start")) {
        player.setStartPoint(obj.global.body.position);
        player.respawn();
    }
    if (obj.name.toLowerCase().includes("start") || obj.name.toLowerCase().includes("checkpoint")) {
        obj.addEventListener("collision", function (contact) {
            var player = null;
            if(gameEngine.entitySystem.getEntityFromShape(contact.body1) instanceof Player){
                player = gameEngine.entitySystem.getEntityFromShape(contact.body1);
            }
            else if(gameEngine.entitySystem.getEntityFromShape(contact.body2) instanceof Player){
                player = gameEngine.entitySystem.getEntityFromShape(contact.body2);
            }

            if(!player){
                return;
            }
            player.setSpawnPoint(player.getMainShape().global.body.position, true);
        })
    }
}
for (var mesh of map.meshes) {
    gameEngine.graphicsEngine.addToScene(mesh);
}
for (var entity of map.entities) {
    entity.setMeshAndAddToScene({}, gameEngine);
    gameEngine.entitySystem.register(entity);
    entity.addToWorld(gameEngine.world);
}



gameEngine.timer.schedule(gameEngine.fpsStepper);

function render() {
    stats.begin();
    gameEngine.cameraControls.update();


    gameEngine.fpsStepper.job = function () {
        player.updateKeys(gameEngine);
        gameEngine.cameraControls.reset();
        gameEngine.updateEntitiesStep();

        stats2.begin();
        gameEngine.stepWorld();
        stats2.end();
    }
    gameEngine.updateEntities();
    gameEngine.updateGraphicsEngine();
    gameEngine.updateGameCamera(Vector3.from(player.getMainShape()?.mesh?.mesh?.position ?? player.getMainShape().global.body.position.copy()));
    gameEngine.particleSystem.update();
    gameEngine.graphicsEngine.render();
    gameEngine.timer.step();
    requestAnimationFrame(render);

    stats.end();
}


render();