import { MaterialModel3D } from "./materialModel3D.js";
import { VAOInfos } from "./shader.js";
import { Util } from "./util.js";

export class Model3D {
    constructor() {
        this._vaoInfos = new VAOInfos();  // NOTE - instance of VAOOptions

        // NOTE - model center (model coordinates)
        this.ox = 0.0;
        this.oy = 0.0;
        this.oz = 0.0;
        this._origin = Array(3);
        // NOTE - model position
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this._position = Array(3);
        // NOTE - scale values
        this.sx = 1.0;
        this.sy = 1.0;
        this.sz = 1.0;
        this._scale = Array(3);
        // NOTE - rotations values
        this.rx = 0.0;
        this.ry = 0.0;
        this.rz = 0.0;
        this._rotation = Array(3);

        this.material = new MaterialModel3D();
    }

    get vaoInfos() {
        return this._vaoInfos;
    }

    set vaoInfos(value) { return undefined; }

    get transformation() {
        let acc = Util.identity4;
        // NOTE - scale the model
        acc = Util.cpuScale(...this.scale,acc);
        // NOTE - translate to world center (considering the new size)
        acc = Util.cpuTranslate(...Util.MathJs.multiply(-1,this.origin),acc);
        // NOTE - now rotate (now with the model center on world center)
        acc = Util.cpuRotate(...this.rotation,acc);
        // NOTE - return model to original position
        acc = Util.cpuTranslate(...this.origin,acc);
        // NOTE - apply the desired positioning
        acc = Util.cpuTranslate(...this.position,acc);
        return acc;
    }

    get origin() {
        this._origin[0] = this.ox;
        this._origin[1] = this.oy;
        this._origin[2] = this.oz;
        return this._origin;
    }

    get position() {
        this._position[0] = this.x;
        this._position[1] = this.y;
        this._position[2] = this.z;
        return this._position;
    }

    get scale() {
        this._scale[0] = this.sx;
        this._scale[1] = this.sy;
        this._scale[2] = this.sz;
        return this._scale;
    }

    get rotation() {
        this._rotation[0] = this.rx;
        this._rotation[1] = this.ry;
        this._rotation[2] = this.rz;
        return this._rotation;
    }
}