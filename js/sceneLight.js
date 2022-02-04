export class SceneLight {
    constructor() {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this._position = new Array(3);
        this.r = 1.0;
        this.g = 1.0;
        this.b = 1.0;
        this.a = 1.0;
        this._color = new Array(4);
        this.intensity = 0.0;
        this._array = new Array(8);
    }

    get position() {
        this._position[0] = this.x;
        this._position[1] = this.y;
        this._position[2] = this.z;
        return this._position;
    }

    get color() {
        this._color[0] = this.r;
        this._color[1] = this.g;
        this._color[2] = this.g;
        this._color[3] = this.a;
        return this._color;
    }

    get asFloatArray() {
        this._array[0] = this.x;
        this._array[1] = this.y;
        this._array[2] = this.z;
        this._array[3] = this.r;
        this._array[4] = this.g;
        this._array[5] = this.b;
        this._array[6] = this.a;
        this._array[7] = this.intensity;
        return this._array;
    }
}
