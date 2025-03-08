import WorldObject from "../Core/WorldObject.mjs";
import ClassRegistry from "../Core/ClassRegistry.mjs";

const Constraint = class extends WorldObject {

    
    static name = "CONSTRAINT";

    constructor(options) {
        super(options);
        this.ignore = false;
    }

    solve(){
        return null;
    }

    toJSON(){
        var json = super.toJSON();
        json.ignore = this.ignore;
        return json;
    }

    static fromJSON(json, world){
        var constraint = super.fromJSON(json, world, graphicsEngine);
        constraint.ignore = json.ignore;
        return constraint;
    }
}


ClassRegistry.register(Constraint);


export default Constraint;