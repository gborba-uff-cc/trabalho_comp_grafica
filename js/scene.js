import fragShaderSrc from '../shaders/simple.frag.js';
import vertShaderSrc from '../shaders/simple.vert.js';
import bunny_ply from '../models/bunny.ply.js';
import square_ply from '../models/square.ply.js';

import { SceneLight } from "./sceneLight.js"
import { SceneCamera } from "./sceneCamera.js"
import { Model3D } from "./model3D.js"
import { Shader } from "./shader.js";
import { Util } from "./util.js";
import { model3DFromPlyObject, parsePly } from './handlerPly.js';

export class Scene {
    constructor(gl, width, height) {
        this.gl = gl;
        this.dt = 0.0;

        // NOTE - Projection parameters
        this.frustum = {
            left: -1.0*width/height,
            right: 1.0*width/height,
            bottom: -1.0,
            top: 1.0,
            near: -1.0,
            far: 1.0,
            fovy: Math.PI/3,
            aspectRatio: width/height};
        this.projection = Util.identity4;
        this._camProjection = 'perspective';
        this.updateProjectionMatrix();

        this._uLocModelMaterial = -1;
        this._uLocModel = -1;
        this._uLocView = -1;
        this._uLocProjection = -1;

        this._uLocLightData = -1;
        this._uLocCameraData = -1;

        this.models = [];

        this.orbitCamera = false;
        this.activeCamera = new SceneCamera();
        // console.log(this.activeCamera);

        this._viewTransformation = Util.identity4;
        // NOTE - the maximum number of light sources is defined staticaly in the frag shader
        // MAX_LIGHTS = 5, to change it, is needed to edit the fragment shader
        this.lights = new Array(5);
        for (let i = 0; i < this.lights.length; i++) {
            const light = new SceneLight();
            if (i === 0) {
                light.intensity = 1.0;
                light.y = 3.0;
            }
            this.lights[i] = light;
            // console.log(light);
        }

        this.init(gl);
    }

    get camProjection() {
        return this._camProjection;
    }

    set camProjection(value) {
        if (!(['perspective','orthogonal'].includes(value))) {throw new Error('Value is not "perspective" nor "orthogonal".'); }
        this._camProjection = value;
        this.updateProjectionMatrix();
    }

    init(gl) {
        this.createShaderProgram(gl);
        gl.useProgram(this.program);
        this.createUniforms(gl);

        // SECTION - unforms sent once per scene
        // ...
        // !SECTION
    }

    update() {
        if (this.orbitCamera) {
            let orbitRy = Math.PI / 16 * this.dt;
            this.activeCamera.orbitTo(0.0,0.0,0.0,0.0,orbitRy,0.0);
        }
        this._viewTransformation = this.activeCamera.transformation;
    }

    draw(gl, translate) {
        // FIXME - retirar a checagem de tipo quando terminar de escrever o código
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Scene.draw()'); }

        gl.useProgram(this.program);

        // SECTION - uniforms sent every frame
        gl.uniformMatrix4fv(this._uLocProjection, true, Util.array2DTo1D(this.projection));

        let lightsAsArray = [];
        for (let i = 0; i < this.lights.length; i++) {
            let light = this.lights[i];
            if (light instanceof SceneLight) {
                lightsAsArray.push(...light.asFloatArray);
            }
        }
        gl.uniform1fv(this._uLocLightData, lightsAsArray, 0, lightsAsArray.length);

        this.updateProjectionMatrix();
        gl.uniformMatrix4fv(this._uLocView, true, Util.array2DTo1D(this._viewTransformation));
        let cameraAsArray = this.activeCamera.asFloatArray;
        gl.uniform1fv(this._uLocCameraData, cameraAsArray, 0, cameraAsArray.length);
        // !SECTION

        // SECTION - drawModels()
        for (let i = 0; i < this.models.length; i++) {
            const model = this.models[i];
            if (model instanceof Model3D) {
                // SECTION - uniforms sent every frame per model
                // NOTE - send to gpu this model material information
                const modelMaterialAsArray = model.material.asFloatArray;
                gl.uniform1fv(this._uLocModelMaterial, modelMaterialAsArray, 0, modelMaterialAsArray.length);
                // NOTE - send to gpu this model transformation matrix to GPU
                gl.uniformMatrix4fv(this._uLocModel, true, Util.array2DTo1D(model.transformation));
                // !SECTION

                gl.bindVertexArray(model.vaoInfos.vaoLoc);
                if (model.vaoInfos.vertexIndexesBufferGlType) {
                    gl.drawElements(
                        gl.TRIANGLES,
                        model.vaoInfos.vertexIndexesArray.length,
                        model.vaoInfos.vertexIndexesBufferGlType,
                        0);
                }
                // NOTE - draw the models (if any) that does not have index buffer
                else {
                    gl.drawArrays(gl.TRIANGLES, 0,
                        model.vaoInfos.vertexArray.length / 4);
                }
            }
        }
        // !SECTION
    }

    addModel(model3D,smoothShading=false,r=1.0,g=1.0,b=1.0,a=1.0) {
        if (!(model3D instanceof Model3D)) { throw new TypeError('in Scene.addModel()'); }

        if (!(model3D.vaoInfos.normalsArray)) {
            const normals = this.generateNormals(model3D, smoothShading);
            model3D.vaoInfos.normalsArray = normals;
        }

        if (!(model3D.vaoInfos.colorsArray)) {
            const colors = this.generateDefaultColor(model3D,r,g,b,a);
            model3D.vaoInfos.colorsArray = colors;
        }

        const idModel = this.models.length;
        this.models.push(model3D);
        this.generateModelVAO(this.gl,model3D);
        return idModel;
    }

    removeModel(nModel) {
        this.models.splice(nModel,1);
    }

    createShaderProgram(gl) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Scene.createShaderProgram()'); }

        this.vertShd = Shader.createShader(gl, gl.VERTEX_SHADER, vertShaderSrc);
        this.fragShd = Shader.createShader(gl, gl.FRAGMENT_SHADER, fragShaderSrc);
        this.program = Shader.createProgram(gl, this.vertShd, this.fragShd);
    }

    createUniforms(gl) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Scene.createUniforms()'); }

        this._uLocModelMaterial = gl.getUniformLocation(this.program,'uModelMaterial');
        this._uLocModel = gl.getUniformLocation(this.program, 'uMatModel');
        this._uLocView = gl.getUniformLocation(this.program, 'uMatView');
        this._uLocProjection = gl.getUniformLocation(this.program, 'uMatProj');

        this._uLocCameraData = gl.getUniformLocation(this.program, 'uCameraData');
        this._uLocLightData = gl.getUniformLocation(this.program, 'uLightsData');
    }

    generateModelVAO(gl, model3D) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Scene.createVAO()'); }
        if (!(model3D instanceof Model3D)) { throw new TypeError('in Scene.createVAO()'); }

        const coordsAttributeLocation = gl.getAttribLocation(this.program, 'position');
        const coordsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(model3D.vaoInfos.vertexArray));

        const normalsAttributeLocation = gl.getAttribLocation(this.program, 'normal');
        const normalsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(model3D.vaoInfos.normalsArray));

        const colorsAttributeLocation = gl.getAttribLocation(this.program, 'color');
        const colorsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(model3D.vaoInfos.colorsArray));

        // NOTE - update
        model3D.vaoInfos.vertexAttribLoc = coordsAttributeLocation;
        model3D.vaoInfos.vertexBuffer = coordsBuffer;
        model3D.vaoInfos.normalsAttribLoc = normalsAttributeLocation;
        model3D.vaoInfos.normalsBuffer = normalsBuffer;
        model3D.vaoInfos.colorsAttribLoc = colorsAttributeLocation;
        model3D.vaoInfos.colorsBuffer = colorsBuffer;

        const aVaoLoc = Shader.createVAO2(gl, model3D.vaoInfos);
        model3D.vaoInfos.vaoLoc = aVaoLoc;

        return;
    }

    generateNormals(model3D, smoothNormals=false) {
        if (!(model3D instanceof Model3D)) { throw new TypeError('in Scene.generateNormals()'); }
        const MathJs = Util.MathJs;

        let normals = [];
        let normal;
        // NOTE - does not have vertex indices
        if (!model3D.vaoInfos.vertexIndexesArray) {
            // NOTE - flat shadding
            // NOTE - for each triangle (4 * 3 coords)
            for (let i = 0; i < model3D.vaoInfos.vertexArray.length/12; i++) {
                normal = [
                    ...MathJs.cross(
                        MathJs.subtract(
                            model3D.vaoInfos.vertexArray.slice(i*12+4,i*12+7),
                            model3D.vaoInfos.vertexArray.slice(i*12,i*12+3)),
                        MathJs.subtract(
                            model3D.vaoInfos.vertexArray.slice(i*12+8,i*12+11),
                            model3D.vaoInfos.vertexArray.slice(i*12,i*12+3)),
                        ),
                        0];

                // NOTE - normalize vectors
                let norm = Math.hypot(...normals[i]);
                normal = MathJs.divide(normals[i],norm);

                normals.push(...normal);
                normals.push(...normal);
                normals.push(...normal);
            }
            return new Float32Array(normals)
        }
        // NOTE - models have vertex indexes
        else {
            const vertexPerFace = 3;  // NOTE - number of vertex per face
            const vertexNComp = 4;  // NOTE - number of components

            normals = new Array(model3D.vaoInfos.vertexArray.length/vertexNComp);
            for (let i = 0; i < normals.length; i++) {
                normals[i] = [...[0.0,0.0,0.0,0.0]];

            }
            const vertexIndexesArray = model3D.vaoInfos.vertexIndexesArray;
            let a, b, c;
            let ab, bc;
            let iStart, iAssignment;

            // NOTE - for each 3 vertex (triangle)
            for (let i = 0; i < vertexIndexesArray.length; i += vertexPerFace) {
                iStart = vertexIndexesArray[i]*vertexNComp;
                a = model3D.vaoInfos.vertexArray.slice(iStart, iStart+4);
                iStart = vertexIndexesArray[i+1]*vertexNComp;
                b = model3D.vaoInfos.vertexArray.slice(iStart, iStart+4);
                iStart = vertexIndexesArray[i+2]*vertexNComp;
                c = model3D.vaoInfos.vertexArray.slice(iStart, iStart+4);

                ab = [b[0]-a[0],b[1]-a[1],b[2]-a[2]];
                bc = [c[0]-b[0],c[1]-b[1],c[2]-b[2]];

                normal = MathJs.cross(ab,bc);

                for (iAssignment = 0; iAssignment < vertexPerFace; iAssignment++) {
                    if (smoothNormals) {
                        normals[vertexIndexesArray[i+iAssignment]][0] += normal[0];
                        normals[vertexIndexesArray[i+iAssignment]][1] += normal[1];
                        normals[vertexIndexesArray[i+iAssignment]][2] += normal[2];
                    }
                    else {
                        normals[vertexIndexesArray[i+iAssignment]][0] = normal[0];
                        normals[vertexIndexesArray[i+iAssignment]][1] = normal[1];
                        normals[vertexIndexesArray[i+iAssignment]][2] = normal[2];
                    }
                }
            }
            // NOTE - normalize vectors
            let norm = 0.0;
            for (let i = 0; i < normals.length; i++) {
                norm = Math.hypot(...normals[i])
                normals[i] = MathJs.divide(normals[i],norm);
            }

            return new Float32Array(normals.flat());
        }
    }

    generateDefaultColor(model3D, r=1.0, g=1.0, b=1.0, a=1.0) {
        if (!(model3D instanceof Model3D)) { throw new TypeError('in Scene.generateDefaultColor()'); }

        const nVertex = model3D.vaoInfos.vertexArray.length;
        const colors = new Float32Array(nVertex);
        for (let i = 0; i < colors.length; i+=1) {
            if (i % 4 === 0) {
                colors[i] = r
            }
            else if (i % 4 === 1) {
                colors[i] = g
            }
            else if (i % 4 === 2) {
                colors[i] = b
            }
            else if (i % 4 === 3) {
                colors[i] = a
            }
        }
        return new Float32Array(colors);
    }

    updateProjectionMatrix() {
        const type = this.camProjection;
        if (type === 'orthogonal') {
            Util.orthogonalProjection(
                this.projection,
                this.frustum.left, this.frustum.right,
                this.frustum.bottom, this.frustum.top,
                this.frustum.near, this.frustum.far);
        }
        else {
            Util.perspectiveProjection(
                this.projection,
                this.frustum.fovy, this.frustum.aspectRatio,
                this.frustum.near, this.frustum.far);
        }
    }

    clearScene() {
        this.lights = new Array(5);
        for (let i = 0; i < this.lights.length; i++) {
            const light = new SceneLight();
            if (i === 0) {
                light.intensity = 1.0;
                light.y = 3.0;
            }
            this.lights[i] = light;
        }

        this.frustum.left = -1.0*this.frustum.aspectRatio;
        this.frustum.right = 1.0*this.frustum.aspectRatio;
        this.frustum.bottom = -1.0;
        this.frustum.top = 1.0;
        this.frustum.near = -1.0;
        this.frustum.far = 1.0;

        this.camProjection = 'perspective';
        this.orbitCamera = false;

        this.models = [];

        this.activeCamera.eyex = 0;
        this.activeCamera.eyey = 0;
        this.activeCamera.eyez = 1;
        this.activeCamera.upx = 0;
        this.activeCamera.upy = 1;
        this.activeCamera.upz = 0;
        this.activeCamera.targetx = 0;
        this.activeCamera.targety = 0;
        this.activeCamera.targetz = 0;
        this.orbitCamera = false;
    }

    loadScene() {

        this.clearScene();
        this.frustum.left = -1.0*this.frustum.aspectRatio;
        this.frustum.right = 1.0*this.frustum.aspectRatio;
        this.frustum.bottom = -1.0;
        this.frustum.top = 1.0;
        this.frustum.near = -1.0;
        this.frustum.far = 1.0;
        this.updateProjectionMatrix()

        // SECTION - load models
        let aPlyText;
        let aPlyObject;
        let aModel;
        // Floor ------------------------------
        aPlyText = square_ply;
        aPlyObject = parsePly(aPlyText);
        // ------------------------------
        aModel = model3DFromPlyObject(aPlyObject);
        aModel.material.ambientReaction = 0.3;
        aModel.material.difuseReaction = 0.5;
        aModel.material.specularReaction = 0.2;
        aModel.ox = 0.5;
        aModel.oz = 0.5;
        aModel.x = -10.0;
        aModel.z = -10.0;
        aModel.sx = 20.0;
        aModel.sz = 20.0;
        this.addModel(aModel);
        // Bunny ------------------------------
        aPlyText = bunny_ply;
        aPlyObject = parsePly(aPlyText);
        // ------------------------------
        aModel = model3DFromPlyObject(aPlyObject);
        aModel.material.ambientReaction = 0.2;
        aModel.material.difuseReaction = 0.5;
        aModel.material.specularReaction = 0.3;
        aModel.oz = -.986;
        aModel.x = -1.5;
        aModel.z = 1.986;
        aModel.rx = -Math.PI/2;
        aModel.ry = Math.PI;
        this.addModel(aModel,true);  // NOTE - with smooth shading
        // ------------------------------
        aModel = model3DFromPlyObject(aPlyObject);
        aModel.material.ambientReaction = 0.2;
        aModel.material.difuseReaction = 0.5;
        aModel.material.specularReaction = 0.3;
        aModel.oz = -0.986;
        aModel.x = 1.0;
        aModel.z = -0.014;
        aModel.rx = -Math.PI/2;
        this.addModel(aModel);  // NOTE - with hard shading
        // ------------------------------

        // for (let i = 0; i < 2; i++) {
        //     const model = new Model3D();
        //     const cube = this.createCube();
        //     model.vaoInfos.vertexArray = cube.vertsVBO;
        //     model.vaoInfos.normalsArray = cube.normalVBO;
        //     model.vaoInfos.colorsArray = cube.colorsVBO;
        //     model.ox = 0.5;
        //     model.oy = 0.5;
        //     model.oz = 0.5;
        //     model.sx = 10;
        //     model.sy = 10;
        //     model.sz = 10;
        //     if (i === 0) {
        //         model.x = -2;
        //     } else if (i === 1) {
        //         model.x = 1;
        //     }

        //     this.generateModelVAO(this.gl, model);
        //     console.log(model);
        //     this.models.push(model);
        // }
        // // !SECTION

        // SECTION - load camera
        this.activeCamera.eyex = 0.0;
        this.activeCamera.eyey = 2.0;
        this.activeCamera.eyez = 8.0;
        // !SECTION

        // SECTION - lights
        for (let i = 0; i < this.lights.length; i++) {
            const light = new SceneLight();
            // NOTE - colors
            if (i == 1 || i == 2) {
                light.r = 0.9333;
                light.g = 0.6073;
                light.b = 0.0;
            }
            else if (i == 3 || i == 4) {
                light.r = 0.0392;
                light.g = 0.5764;
                light.b = 0.5882;
            }

            light.y = 0.5;
            light.intensity = 0.3;
            switch (i) {
            case 0:
                light.intensity = 0.7;
                light.y = 1.5;
                break;
            case 1:
                light.z = 4.0;
                break;
            case 2:
                light.x = 4.0;
                break;
            case 3:
                light.z = -4.0;
                break;
            case 4:
                light.x = -4.0;
                break;
            }
            this.lights[i] = light;
        }
        // !SECTION
    }

    // createCube() {
    // // SECTION - todos os triangulos estão no sentido horario
    // // NOTE - professor
    //     const verts = [
    //         [0.0,0.0,0.0,1.0], // v0
    //         [0.1,0.0,0.0,1.0], // v1
    //         [0.1,0.0,0.1,1.0], // v2
    //         [0.0,0.0,0.1,1.0], // v3
    //         [0.0,0.1,0.1,1.0], // v4
    //         [0.1,0.1,0.1,1.0], // v5
    //         [0.1,0.1,0.0,1.0], // v6
    //         [0.0,0.1,0.0,1.0]  // v7
    //     ];

    //     const color = [
    //         [0.0,1.0,0.0,1.0], // v0
    //         [0.0,1.0,0.0,1.0], // v1
    //         [0.0,1.0,0.0,1.0], // v2
    //         [0.0,1.0,0.0,1.0], // v3
    //         [0.0,1.0,0.0,1.0], // v4
    //         [0.0,1.0,0.0,1.0], // v5
    //         [0.0,1.0,0.0,1.0], // v6
    //         [0.0,1.0,0.0,1.0]  // v7
    //     ];
    //     const vertsVBO = [
    //         ...verts[0], ...verts[1], ...verts[3],
    //         ...verts[1], ...verts[2], ...verts[3],
    //         ...verts[4], ...verts[5], ...verts[7],
    //         ...verts[5], ...verts[6], ...verts[7],
    //         ...verts[4], ...verts[7], ...verts[3],
    //         ...verts[0], ...verts[3], ...verts[7],
    //         ...verts[7], ...verts[6], ...verts[0],
    //         ...verts[0], ...verts[6], ...verts[1],
    //         ...verts[6], ...verts[5], ...verts[1],
    //         ...verts[1], ...verts[5], ...verts[2],
    //         ...verts[2], ...verts[5], ...verts[4],
    //         ...verts[2], ...verts[4], ...verts[3],
    //     ];

    //     const colorsVBO =  [
    //         ...color[0], ...color[1], ...color[3],
    //         ...color[1], ...color[2], ...color[3],
    //         ...color[4], ...color[5], ...color[7],
    //         ...color[5], ...color[6], ...color[7],
    //         ...color[4], ...color[7], ...color[3],
    //         ...color[0], ...color[3], ...color[7],
    //         ...color[7], ...color[6], ...color[0],
    //         ...color[0], ...color[6], ...color[1],
    //         ...color[6], ...color[5], ...color[1],
    //         ...color[1], ...color[5], ...color[2],
    //         ...color[2], ...color[5], ...color[4],
    //         ...color[2], ...color[4], ...color[3],
    //     ];
    //     const MathJs = Util.MathJs;

    //     let normalVBO = [];
    //     // NOTE - flat shadding
    //     // NOTE - for each triangle (4 * 3 coords)
    //     for (let i = 0; i < vertsVBO.length/12; i++) {
    //         let normal = [
    //             ...MathJs.cross(
    //                 MathJs.subtract(
    //                     vertsVBO.slice(i*12+4,i*12+7),
    //                     vertsVBO.slice(i*12,i*12+3)),
    //                 MathJs.subtract(
    //                     vertsVBO.slice(i*12+8,i*12+11),
    //                     vertsVBO.slice(i*12,i*12+3)),
    //                 ),
    //                 0];

    //         normalVBO.push(...normal);
    //         normalVBO.push(...normal);
    //         normalVBO.push(...normal);
    //     }
    //     return { vertsVBO, colorsVBO, normalVBO };
    // }
}
