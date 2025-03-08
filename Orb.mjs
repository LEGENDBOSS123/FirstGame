import Entity from "./3D/Entity/Entity.mjs";
import Vector3 from "./3D/Physics/Math3D/Vector3.mjs";

const Orb = class extends Entity {
    constructor(options) {
        super(options);
        this.gravity = options?.gravity;
        this.sphere = new Sphere({
            radius: options?.radius ?? 1,
            local: {
                body: {
                    mass: 1
                }
            }
        });

        this.updateShapeID(this.sphere);
    }

    addToScene(scene) {
        this.sphere.addToScene(scene);
    }
    addToWorld(world) {
        world.addComposite(this.sphere);
        this.updateShapeID();
    }

    setMeshAndAddToScene(graphicsEngine){
        this.sphere.setMeshAndAddToScene({}, graphicsEngine);
    }
}