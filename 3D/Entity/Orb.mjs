import Entity from "./Entity.mjs";
import Vector3 from "../Physics/Math3D/Vector3.mjs";
import Sphere from "../Physics/Shapes/Sphere.mjs";
const Orb = class extends Entity {
    constructor(options) {
        super(options);
        this.gravity = options?.gravity ?? -0.4;
        this.sphere = new Sphere({
            radius: options?.radius ?? 1,
            local: {
                body: {
                    mass: options?.mass ?? 1
                }
            },
            global:{
                body: {
                    position: options?.position,
                    acceleration: new Vector3(0, this.gravity, 0)
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

    setMeshAndAddToScene(options, graphicsEngine){
        this.sphere.setMeshAndAddToScene(options, graphicsEngine);
    }

    getMainShape(){
        return this.sphere;
    }
}

export default Orb;