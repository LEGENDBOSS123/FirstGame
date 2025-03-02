import Composite from "./3D/Physics/Shapes/Composite.mjs";
import Sphere from "./3D/Physics/Shapes/Sphere.mjs";
import Vector3 from "./3D/Physics/Math3D/Vector3.mjs";
import Entity from "./Entity.mjs";
import Quaternion from "./3D/Physics/Math3D/Quaternion.mjs";
var Player = class extends Entity {
    constructor(options) {
        super(options);
        this.gravity = options?.gravity ?? new Vector3(0, 0, 0);
        this.moveSpeed = options?.moveSpeed ?? 1;
        this.moveStrength = options?.moveStrength ?? 1;
        this.airMoveStrength = options?.airMoveStrength ?? 0.1;
        this.jumpSpeed = options?.jumpSpeed ?? 1;
        this.composite = new Composite({
            global: {
                body: {
                    position: options?.position ?? new Vector3(0, 0, 0),
                    acceleration: this.gravity,
                }
            },
            local: {
                body: {
                    mass: 0
                }
            }
        });
        this.sphere = new Sphere({
            radius: (options?.radius ?? 1),
            local: {
                body: {
                    mass: options?.mass ?? 1
                }
            }
        });

        this.composite.add(this.sphere);
        this.sphere.collisionMask = 0;
        this.sphere.collisionMask = this.sphere.setBitMask(this.sphere.collisionMask, "P", true);


        this.composite.setLocalFlag(Composite.FLAGS.CENTER_OF_MASS, true);
        this.composite.syncAll();
        this.composite.setRestitution(0);
        this.composite.setFriction(0);
        this.sphere.setRestitution(0);
        this.sphere.setFriction(0);
        this.spawnPoint = this.sphere.global.body.position.copy();
        this.canJump = false;
        this.touchingGround = false;
        this.touchingWall = false;
        this.wallNormal = new Vector3();
        this.jumpPostCollision = function (contact) {
            if (contact.body1.maxParent == this.composite) {
                if (contact.normal.dot(new Vector3(0, 1, 0)) > 0.75) {
                    this.canJump = true;
                    this.touchingGround = true;
                }
                if (Math.abs(contact.normal.dot(new Vector3(0, 1, 0))) < 0.3) {
                    this.touchingWall = true;
                    this.wallNormal = contact.normal.copy();
                }
            }
            else {
                if (contact.normal.dot(new Vector3(0, -1, 0)) > 0.75) {
                    this.canJump = true;
                    this.touchingGround = true;
                }
                if (Math.abs(contact.normal.dot(new Vector3(0, -1, 0))) < 0.3) {
                    this.touchingWall = true;
                    this.wallNormal = contact.normal.copy();
                }
            }
        }.bind(this);

        this.postStepCallback = function () {
            var vel = this.composite.global.body.getVelocity();
            var velXZ = new Vector3(vel.x, 0, vel.z);

            if (velXZ.magnitudeSquared() < 0.0001) {
                return;
            }

            this.composite.global.body.rotation = Quaternion.lookAt(velXZ.normalize(), new Vector3(0, 1, 0));
        }.bind(this);


        this.preStepCallback = function () {
            this.touchingGround = false;
            this.touchingWall = false;
        }.bind(this);

        this.sphere.addEventListener("postCollision", this.jumpPostCollision);
        this.sphere.addEventListener("preStep", this.preStepCallback);

        this.composite.addEventListener("postStep", this.postStepCallback);

        this.updateShapeID(this.composite);

        this.keysHeld = {};
        this.justToggled = {};
        this.keysVector = new Vector3();
    }

    addToScene(scene) {
        this.composite.addToScene(scene);
        this.sphere.addToScene(scene);
    }

    addToWorld(world) {
        world.addComposite(this.composite);
        world.addComposite(this.sphere);
        this.updateShapeID();
    }

    setMeshAndAddToScene(options, graphicsEngine) {

        graphicsEngine.load("roblox_default_character.glb", function (gltf) {
            gltf.scene.scale.set(...(new Vector3(0.4, 0.4, 0.4).scale(this.sphere.radius)));
            gltf.scene.children[0].quaternion.copy(Quaternion.from(gltf.scene.children[0].quaternion).rotateByAngularVelocity(new Vector3(0, 2, 0)));
            for (var e of gltf.scene.children) {
                e.position.z -= 6.65;
                e.position.x -= 2.805;
                e.position.y -= 0.485;
            }
            gltf.scene.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            })
            var meshData = graphicsEngine.meshLinker.createMeshData(gltf.scene);
            this.composite.mesh = meshData;
            this.addToScene(graphicsEngine.scene);
        }.bind(this));
        this.sphere.setMeshAndAddToScene({}, graphicsEngine);

    }

    wasKeyJustPressed(key) {
        return !!(this.keysHeld[key] && this.justToggled[key]);
    }

    wasKeyJustReleased(key) {
        return !!(!this.keysHeld[key] && this.justToggled[key]);
    }

    isKeyHeld(key) {
        return !!this.keysHeld[key];
    }

    getKeysVector() {
        return this.keysVector.copy();
    }

    updateKeys(held, justToggled, delta) {
        this.keysHeld = structuredClone(held);
        this.justToggled = structuredClone(justToggled);
        this.keysVector = delta.copy();
    }

    update() {
        var vel = this.composite.global.body.getVelocity();
        var velHorizontal = vel.copy()
        velHorizontal.y = 0;
        var vec = this.getKeysVector();
        
        var vecHorizontal = vec.copy();
        vecHorizontal.y = 0;
        vecHorizontal.normalizeInPlace();
        
        var desiredVelocity = vecHorizontal.scale(this.moveSpeed);
        var velDelta = desiredVelocity.subtract(velHorizontal);
        var mag = velDelta.magnitude();

        var moveStrength = this.moveStrength;
        if(!this.touchingGround) {
            moveStrength = this.airMoveStrength;
        }

        if(mag > this.moveSpeed * moveStrength) {
            velDelta.scaleInPlace(this.moveSpeed * moveStrength/mag);
        }
        if(this.wasKeyJustPressed("up")){
            velDelta.y = this.jumpSpeed;
        }
        this.composite.global.body.setVelocity(vel.add(velDelta));
    }

    respawn() {
        this.composite.global.body.setPosition(this.spawnPoint.copy());
        this.composite.global.body.setVelocity(new Vector3(0, 0, 0));
        this.composite.global.body.angularVelocity.reset();
        this.composite.global.body.rotation.reset();
        this.composite.global.body.netForce.reset();
        this.composite.global.body.netTorque.reset();
        this.canJump = true;
        this.composite.syncAll();
    }

    toJSON() {
        var json = super.toJSON();
        json.sphere = this.sphere.id;
        json.composite = this.composite.id;
        json.moveSpeed = this.moveSpeed;
        json.moveStrength = this.moveStrength;
        json.jumpSpeed = this.jumpSpeed;
        json.spawnPoint = this.spawnPoint.toJSON();
        json.canJump = this.canJump;
        return json;
    }

    static fromJSON(json, world) {
        var player = super.fromJSON(json, world);
        player.moveSpeed = json.moveSpeed;
        player.moveStrength = json.moveStrength;
        player.jumpSpeed = json.jumpSpeed;
        player.spawnPoint = Vector3.fromJSON(json.spawnPoint);
        player.composite = json.composite;
        player.sphere = json.sphere;
        player.canJump = json.canJump;
        return player;
    }

    updateReferences(world) {
        this.composite = world.getByID(this.composite);
        this.sphere = world.getByID(this.sphere);
        this.sphere.addEventListener("postCollision", this.jumpPostCollision);
        this.composite.addEventListener("postStep", this.postStepCallback);
        this.sphere.addEventListener("preStep", this.preStepCallback);
    }

    getMainShape() {
        return this.composite;
    }
}

export default Player;