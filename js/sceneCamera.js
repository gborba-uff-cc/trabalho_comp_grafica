import { Util } from "./util.js";

export class SceneCamera {  // NOTE - working
    constructor() {
        this.eyex = 0.0;
        this.eyey = 0.0;
        this.eyez = 1.0;
        this._eye = new Array(3);
        this.targetx = 0.0;
        this.targety = 0.0;
        this.targetz = 0.0;
        this._target = new Array(3);
        this.upx = 0.0;
        this.upy = 1.0;
        this.upz = 0.0;
        this._up = new Array(3);
        this._array = new Array(9);
    }

    get up() {
        this._up[0] = this.upx;
        this._up[1] = this.upy;
        this._up[2] = this.upz;
        return this._up;
    }

    get eye() {
        this._eye[0] = this.eyex;
        this._eye[1] = this.eyey;
        this._eye[2] = this.eyez;
        return this._eye;
    }

    get target() {
        this._target[0] = this.targetx;
        this._target[1] = this.targety;
        this._target[2] = this.targetz;
        return this._target;
    }

    get asFloatArray() {
        this._array[0] = this.eyex;
        this._array[1] = this.eyey;
        this._array[2] = this.eyez;
        this._array[3] = this.targetx;
        this._array[4] = this.targety;
        this._array[5] = this.targetz;
        this._array[6] = this.upx;
        this._array[7] = this.upy;
        this._array[8] = this.upz;
        return this._array;
    }

    get transformation() {
        const MathJs = Util.MathJs;

        // NOTE - n is the new z; should be n = eye - target
        let n = MathJs.subtract(this.eye, this.target);
        const nNorm = Math.hypot(...n);
        if (!(nNorm)) {
            console.log('updateViewMatrix: got 0 for n norm.');
            return;
        }
        n = MathJs.divide(n, nNorm);

        // // SECTION - glmatrix equivalet
        // // NOTE v is the new x; should be v = up x z
        // let v = MathJs.cross(this.up.slice(0,3), n.slice(0,3));
        // const vNorm = Math.hypot(v[0],v[1],v[2]);
        // if (!(vNorm)) {
        //     console.log('updateViewMatrix: got 0 for v norm.');
        //     return;
        // }
        // v = MathJs.divide(v, vNorm);

        // // NOTE - u is the new y; should be y = z x x
        // let u = MathJs.cross(n.slice(0,3), v.slice(0,3));
        // u.push(0);
        // const uNorm = Math.hypot(u[0],u[1],u[2]);
        // if (!(uNorm)) {
        //     console.log('updateViewMatrix: got 0 for u norm.');
        //     return;
        // }
        // u = MathJs.divide(u, uNorm);

        // const r = [
        //     [v[0], v[1], v[2], 0.0],
        //     [u[0], u[1], u[2], 0.0],
        //     [n[0], n[1], n[2], 0.0],
        //     [0.0 , 0.0 , 0.0 , 1.0]];
        // // !SECTION

        // SECTION
        // NOTE v is the new y; should be y = up - proj_z(up)
        const projUpOntoN = MathJs.multiply(MathJs.dot(this.up, n)/MathJs.dot(n, n), n);
        let v = MathJs.subtract(this.up, projUpOntoN);
        const vNorm = Math.hypot(...v);
        if (!(vNorm)) {
            console.log('updateViewMatrix: got 0 for v norm.');
            return;
        }
        v = MathJs.divide(v, vNorm);

        // NOTE - u is the new x; should be x = y x z
        let u = MathJs.cross(v, n);
        const uNorm = Math.hypot(...u);
        if (!(uNorm)) {
            console.log('updateViewMatrix: got 0 for u norm.');
            return;
        }
        u = MathJs.divide(u, uNorm);

        const r = [
            [u[0], u[1], u[2], 0.0],  // new x
            [v[0], v[1], v[2], 0.0],  // new y
            [n[0], n[1], n[2], 0.0],  // new z
            [0.0 , 0.0 , 0.0 , 1.0]];
        // !SECTION
        const t = [
            [1.0, 0.0, 0.0, -this.eyex],
            [0.0, 1.0, 0.0, -this.eyey],
            [0.0, 0.0, 1.0, -this.eyez],
            [0.0, 0.0, 0.0, 1.0]];
        return MathJs.multiply(r,t);
    }

    orbitTo(centerx,centery,centerz, rx, ry, rz) {
        let acc = Util.identity4;
        acc = Util.cpuTranslate(-centerx,-centery,-centerz,acc);
        acc = Util.cpuRotate(rx,ry,rz,acc);
        this.targetx = centerx;
        this.targety = centery;
        this.targetz = centerz;
        const eyeColumn = [[this.eyex],[this.eyey],[this.eyez],[1.0]];
        const newEye = Util.multiply(acc,eyeColumn);
        this.eyex = newEye[0][0];
        this.eyey = newEye[1][0];
        this.eyez = newEye[2][0];
    }

}
