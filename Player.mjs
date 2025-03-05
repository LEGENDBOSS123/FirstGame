import Composite from "./3D/Physics/Shapes/Composite.mjs";
import Sphere from "./3D/Physics/Shapes/Sphere.mjs";
import Vector3 from "./3D/Physics/Math3D/Vector3.mjs";
import Entity from "./Entity.mjs";
import Quaternion from "./3D/Physics/Math3D/Quaternion.mjs";
// import Capsule from "./3D/Physics/Shapes/Capsule.mjs";
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
                    angularDamping: 1
                }
            },
            local: {
                body: {
                    mass: 0
                }
            }
        });
        this.sphere = new Sphere({
            radius: 0.5 * (options?.radius ?? 1),
            local: {
                body: {
                    position: new Vector3(0, -0.5 * (options?.radius ?? 1), 0),
                    mass: options?.mass ?? 1
                }
            }
        });
        this.sphere2 = new Sphere({
            radius: 0.5 * (options?.radius ?? 1),
            local: {
                body: {
                    position: new Vector3(0, 0.5 * (options?.radius ?? 1), 0),
                    mass: options?.mass ?? 1
                }
            }
        });
        this.sphere3 = new Sphere({
            radius: 0.5 * (options?.radius ?? 1),
            local: {
                body: {
                    mass: options?.mass ?? 1
                }
            }
        });

        this.composite.add(this.sphere);
        this.composite.add(this.sphere2);
        this.composite.add(this.sphere3);
        this.sphere.collisionMask = 0;
        this.sphere.collisionMask = this.sphere.setBitMask(this.sphere.collisionMask, "P", true);
        this.sphere2.collisionMask = 0;
        this.sphere2.collisionMask = this.sphere2.setBitMask(this.sphere2.collisionMask, "P", true);
        this.sphere3.collisionMask = 0;
        this.sphere3.collisionMask = this.sphere2.setBitMask(this.sphere2.collisionMask, "P", true);


        this.composite.setLocalFlag(Composite.FLAGS.CENTER_OF_MASS, true);
        this.composite.syncAll();
        this.composite.setRestitution(0);
        this.composite.setFriction(0);
        this.sphere.setRestitution(0);
        this.sphere.setFriction(0);
        this.spawnPoint = this.sphere.global.body.position.copy();
        this.canJump = false;
        this.touchingGround = false;
        this.groundVelocity = new Vector3();
        this.touchingWall = false;
        this.wallNormal = new Vector3();

        this.groundDetectDot = 0.75;
        this.wallDetectDot = 0.25;

        this.jumpPostCollision = function (contact) {
            if(contact.invalid){
                return;
            }
            if (contact.body1.maxParent == this.composite) {
                if (contact.normal.dot(new Vector3(0, 1, 0)) > this.groundDetectDot) {
                    this.canJump = true;
                    this.touchingGround = true;
                    this.groundVelocity = contact.velocity
                }
                if (Math.abs(contact.normal.dot(new Vector3(0, 1, 0))) < this.wallDetectDot) {
                    this.touchingWall = true;
                    this.wallNormal = contact.normal.copy();
                    this.groundVelocity = contact.velocity;
                }
            }
            else {
                if (contact.normal.dot(new Vector3(0, -1, 0)) > this.groundDetectDot) {
                    this.canJump = true;
                    this.touchingGround = true;
                }
                if (Math.abs(contact.normal.dot(new Vector3(0, -1, 0))) < this.wallDetectDot) {
                    this.touchingWall = true;
                    this.wallNormal = contact.normal.copy();
                }
            }
        }.bind(this);

        this.postStepCallback = function () {
            var vel = this.composite.global.body.getVelocity();
            var velXZ = new Vector3(vel.x, 0, vel.z);
            var velXZ2 = this.groundVelocity;
            
            if (velXZ.magnitudeSquared() < 0.0001) {
                return;
            }
            if(this.touchingGround) {
                velXZ = velXZ2;
            }
            this.composite.global.body.rotation = Quaternion.lookAt(velXZ.normalize(), new Vector3(0, 1, 0));
        }.bind(this);


        this.preStepCallback = function () {
            if(!this.sphere.sleeping){
                this.touchingGround = false;
                this.touchingWall = false;
            }
        }.bind(this);

        this.sphere.addEventListener("collision", this.jumpPostCollision);
        this.sphere.addEventListener("preStep", this.preStepCallback);

        this.composite.addEventListener("postStep", this.postStepCallback);

        this.updateShapeID(this.composite);

        this.keysHeld = {};
        this.justToggled = {};
        this.keysVector = new Vector3();
    }

    setStartPoint(v){
        var startPoint = localStorage["playerStartPoint"];
        if(!startPoint){
            localStorage["playerStartPoint"] = JSON.stringify(v.toJSON());
        }
        else{
            v = Vector3.from(JSON.parse(startPoint));
        }

        this.spawnPoint = v.copy();
    }

    setSpawnPoint(v){
        this.spawnPoint = v.copy();
        localStorage["playerStartPoint"] = JSON.stringify(v.toJSON());
    }

    addToScene(scene) {
        this.composite.addToScene(scene);
        this.sphere.addToScene(scene);
        this.sphere2.addToScene(scene);
        this.sphere3.addToScene(scene);
    }

    addToWorld(world) {
        world.addComposite(this.composite);
        world.addComposite(this.sphere);
        world.addComposite(this.sphere2);
        world.addComposite(this.sphere3);
        this.updateShapeID();
    }

    setMeshAndAddToScene(options, graphicsEngine) {

        graphicsEngine.load("roblox_default_character.glb").then(function (gltf) {
            gltf.scene.scale.set(...(new Vector3(0.4, 0.4, 0.4).scale(this.sphere.radius * 1.95)));
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
        // this.sphere.setMeshAndAddToScene({}, graphicsEngine);
        // this.sphere2.setMeshAndAddToScene({}, graphicsEngine);
        // this.sphere3.setMeshAndAddToScene({}, graphicsEngine);
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
        var velHorizontal = vel.copy();
        velHorizontal.y = 0;

        var vec = this.getKeysVector();
        var vecHorizontal = vec.copy();
        vecHorizontal.y = 0;
        vecHorizontal.normalizeInPlace();
        
        var desiredVelocity = vecHorizontal.scale(this.moveSpeed);
        if(this.touchingGround){
            var groundVel = this.groundVelocity.copy();
            groundVel.y = 0;
            desiredVelocity.subtractInPlace(groundVel.subtract(velHorizontal));
        }
        var velDelta = desiredVelocity.subtract(velHorizontal);
        var mag = velDelta.magnitude();

        var moveStrength = this.moveStrength;

        if(!this.touchingGround) {
            moveStrength = this.airMoveStrength;
        }

        if(mag > this.moveSpeed * moveStrength) {
            velDelta.scaleInPlace(this.moveSpeed * moveStrength/mag);
        }
        if(this.isKeyHeld("up") && this.canJump && !this.touchingWall){
            velDelta.y = this.jumpSpeed;
            this.canJump = false;
        }
        this.composite.global.body.acceleration = this.gravity.copy();
        if(this.touchingWall){
            this.composite.global.body.acceleration.reset();
            this.composite.global.body.previousPosition.y = this.composite.global.body.position.y;
            this.composite.global.body.previousPosition.addInPlace(this.wallNormal.scale(0.2));
        }
        if(this.isKeyHeld("up") && (this.canJump || this.touchingWall)){
            velDelta.y = this.jumpSpeed;
            velDelta.addInPlace(this.wallNormal.scale(0.3));
            this.composite.global.body.previousPosition.subtractInPlace(this.wallNormal.scale(0.2));
            this.canJump = false;
        }
        if(!this.touchingWall){
            this.composite.global.body.previousPosition.subtractInPlace(this.wallNormal.scale(0.2));
            this.wallNormal.reset();
        }
        this.composite.global.body.previousPosition.subtractInPlace(velDelta);
    }

    respawn() {
        this.composite.global.body.setPosition(this.spawnPoint.copy());
        this.composite.global.body.setVelocity(new Vector3(0, 0, 0));
        this.composite.global.body.angularVelocity.reset();
        this.composite.global.body.rotation.reset();
        this.composite.global.body.netForce.reset();
        this.composite.global.body.netTorque.reset();
        this.canJump = false;
        this.touchingWall = false;
        this.touchingGround = false;
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
        json.touchingWall = this.touchingWall;
        json.touchingGround = this.touchingGround
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
        player.touchingGround = json.touchingGround;
        player.touchingWall = json.touchingWall;
        return player;
    }

    updateReferences(world) {
        this.composite = world.getByID(this.composite);
        this.sphere = world.getByID(this.sphere);
        this.sphere.addEventListener("collision", this.jumpPostCollision);
        this.composite.addEventListener("postStep", this.postStepCallback);
        this.sphere.addEventListener("preStep", this.preStepCallback);
    }

    getMainShape() {
        return this.composite;
    }
}

export default Player;