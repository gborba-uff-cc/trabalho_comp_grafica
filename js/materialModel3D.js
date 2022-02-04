export class MaterialModel3D {
    // constructor(ambient=0.4,difuse=0.3,specular=0.0,specularRefinement=2.5) {
    constructor(ambient=0.4,difuse=0.3,specular=0.3,specularRefinement=2.5) {
        this.ambientReaction = ambient;
        this.difuseReaction = difuse;
        this.specularReaction = specular;
        this.specularRefinement = specularRefinement;
        this._array = new Array(4);
    }

    get asFloatArray() {
        this._array[0] = this.ambientReaction;
        this._array[1] = this.difuseReaction;
        this._array[2] = this.specularReaction;
        this._array[3] = this.specularRefinement;
        return this._array;
    }
}