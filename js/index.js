import { model3DFromPlyObject, parsePly } from './handlerPly.js';
import { Model3D } from './model3D.js';
import { Scene } from './scene.js';
import { SceneCamera } from './sceneCamera.js';
import { SceneLight } from './sceneLight.js';
import { Util } from './util.js';

window.onload = () => {
    const app = new Main();
    app.run();
};

class Main {
    constructor() {
        const canvas = document.querySelector('#glCanvas');
        this.lastCalledTime;
        this.dt = 0.0;
        this.fps = 0.0;

        this.gl = canvas.getContext('webgl2');

        // NOTE - checa se o webGL está disponível
        if (this.gl === null || (!(this.gl instanceof WebGL2RenderingContext))) {
            alert('Impossível inicializar o WebGL');
            return;
        } else {
            console.groupCollapsed('Usando o WebGl2.');
            const debugRendererInfo = this.gl.getExtension("WEBGL_debug_renderer_info");
            console.info(`Renderer Vendor: ${this.gl.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)}`);
            console.info(`Renderer Vendor: ${this.gl.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL)}`);
            // LINK - https://browserleaks.com/webgl for full renderer info
            console.groupEnd();
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        this.gl.canvas.width = 1024 * devicePixelRatio;
        this.gl.canvas.height = 768 * devicePixelRatio;

        this.scene = new Scene(this.gl, this.gl.canvas.width, this.gl.canvas.height);

        this.registerEventListeners();
        this.updateWorldSizeFromScene();
        this.updateCameraFromScene();
        this.idInterval = null;  // NOTE - identifier of the periocal function registered for update the camera values when orbitating
        this.updateLightsFromScene();
        this.updateAddedModelsFromScene();

    }
//-------------------------------------
    run() {
        if (!this.lastCalledTime) {
            this.lastCalledTime = performance.now();
        }

        this.update();
        this.draw();

        // NOTE - refresh dt
        let now = performance.now();
        this.dt = (now - this.lastCalledTime) / 1000;
        this.lastCalledTime = now;

        requestAnimationFrame(this.run.bind(this));
    }
//-------------------------------------
    update() {
        this.scene.dt = this.dt;
        this.scene.update();
    }
//-------------------------------------
    draw() {
        if (!(this.gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Main.draw()'); }

        // NOTE - treat size/resize of canvas
        const devicePixelRatio = window.devicePixelRatio || 1;
        this.gl.canvas.width = 1024 * devicePixelRatio;
        this.gl.canvas.height = 768 * devicePixelRatio;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.gl.clearColor(0.0078, 0.1882, 0.2784, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // SECTION
        // LINK - https://learnopengl.com/Advanced-OpenGL/Face-culling
        this.gl.enable(this.gl.CULL_FACE);

        // LINK - https://stackoverflow.com/a/54385852/16529719
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.clearDepth(0.0);
        this.gl.depthFunc(this.gl.GREATER);
        // !SECTION

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA,this.gl.ONE_MINUS_SRC_ALPHA);

        this.scene.draw(this.gl, 0.0);

        this.gl.disable(this.gl.BLEND);
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.disable(this.gl.DEPTH_TEST);
    }
//-------------------------------------
    registerEventListeners() {
        // NOTE - load the scene for the assignment
        document.querySelector('#btnload').addEventListener('click', (event) => {
            this.scene.loadScene();
            this.updateWorldSizeFromScene();
            this.updateCameraFromScene();
            this.updateLightsFromScene();
            this.updateAddedModelsFromScene();
        });

        // NOTE - retrieve the world size from html page
        document.querySelector('#worldSizeForm').addEventListener('submit', (event) => {
            event.preventDefault(); //prevent the submission of the form for the server
            this.updateSceneWorldSize();
            this.updateWorldSizeFromScene();
        });

        // NOTE - retrieve the camera and target chat from html page
        document.querySelector('#cameraForm').addEventListener('submit', (event) => {
            event.preventDefault(); //prevent the submission of the form for the server
            this.updateSceneCamera();
            this.updateCameraFromScene();
        });

        // NOTE - retrieve the lights info from html page
        document.querySelector('#lightsForm').addEventListener('submit', (event) => {
            event.preventDefault(); //prevent the submission of the form for the server
            this.updateSceneLights();
            this.updateLightsFromScene();
        });

        // NOTE - retrieve the ply file from html page
        document.querySelector('#modelForm').addEventListener('submit', (event) => {
            event.preventDefault(); //prevent the submission of the form for the server
            const file = document.querySelector('#file').files[0];
            const fr = new FileReader();

            // NOTE - add a model to the scene
            fr.addEventListener("load", () => {
                const text = fr.result;
                const aPlyObject = parsePly(text);
                const aModel = model3DFromPlyObject(aPlyObject);
                this.scene.addModel(aModel);
                this.updateAddedModelsFromScene();
            }, false);
            if (file) {
                fr.readAsText(file);
            }
        });
    }
//-------------------------------------
// SECTION - helpers to select the inputs
    inputElementsWorldSize() {

        const wld_left   = document.querySelector('#wldleft');
        const wld_right  = document.querySelector('#wldright');
        const wld_bottom = document.querySelector('#wldbottom');
        const wld_top    = document.querySelector('#wldtop');
        const wld_near   = document.querySelector('#wldnear');
        const wld_far    = document.querySelector('#wldfar');

        return {
            wld_left,wld_right,
            wld_bottom,wld_top,
            wld_near,wld_far };
    }

    inputElementsCamera() {
        const up_x = document.querySelector('#upx');
        const up_y = document.querySelector('#upy');
        const up_z = document.querySelector('#upz');
        const cam_x = document.querySelector('#camx');
        const cam_y = document.querySelector('#camy');
        const cam_z = document.querySelector('#camz');
        const target_x = document.querySelector('#targetx');
        const target_y = document.querySelector('#targety');
        const target_z = document.querySelector('#targetz');
        const espectate = document.querySelector('#camOrbitate');
        const perspective = document.querySelector('#camProjPersp');
        const orthogonal = document.querySelector('#camProjOrtho');

        return {
            up_x,up_y,up_z,
            cam_x,cam_y,cam_z,
            target_x,target_y,target_z,
            espectate, perspective, orthogonal };
    }

    inputElementsLights() {
        const lgt1_x = document.querySelector('#lgt1x');
        const lgt1_y = document.querySelector('#lgt1y');
        const lgt1_z = document.querySelector('#lgt1z');
        const lgt1_i = document.querySelector('#lgt1i');

        const lgt2_x = document.querySelector('#lgt2x');
        const lgt2_y = document.querySelector('#lgt2y');
        const lgt2_z = document.querySelector('#lgt2z');
        const lgt2_i = document.querySelector('#lgt2i');

        const lgt3_x = document.querySelector('#lgt3x');
        const lgt3_y = document.querySelector('#lgt3y');
        const lgt3_z = document.querySelector('#lgt3z');
        const lgt3_i = document.querySelector('#lgt3i');

        const lgt4_x = document.querySelector('#lgt4x');
        const lgt4_y = document.querySelector('#lgt4y');
        const lgt4_z = document.querySelector('#lgt4z');
        const lgt4_i = document.querySelector('#lgt4i');

        const lgt5_x = document.querySelector('#lgt5x');
        const lgt5_y = document.querySelector('#lgt5y');
        const lgt5_z = document.querySelector('#lgt5z');
        const lgt5_i = document.querySelector('#lgt5i');

        return [
            { x:lgt1_x,y:lgt1_y,z:lgt1_z,i:lgt1_i },
            { x:lgt2_x,y:lgt2_y,z:lgt2_z,i:lgt2_i },
            { x:lgt3_x,y:lgt3_y,z:lgt3_z,i:lgt3_i },
            { x:lgt4_x,y:lgt4_y,z:lgt4_z,i:lgt4_i },
            { x:lgt5_x,y:lgt5_y,z:lgt5_z,i:lgt5_i }];
    }

    inputElementsAddedModel(iModel) {
        let part1,part2;
        part1 = `#mdl${iModel}`;
        part2 = `pos`;
        const x = document.querySelector(`${part1}${part2}x`);
        const y = document.querySelector(`${part1}${part2}y`);
        const z = document.querySelector(`${part1}${part2}z`);
        part2 = `orig`;
        const ox = document.querySelector(`${part1}${part2}x`);
        const oy = document.querySelector(`${part1}${part2}y`);
        const oz = document.querySelector(`${part1}${part2}z`);
        part2 = `scl`;
        const sx = document.querySelector(`${part1}${part2}x`);
        const sy = document.querySelector(`${part1}${part2}y`);
        const sz = document.querySelector(`${part1}${part2}z`);
        part2 = `rot`;
        const rx = document.querySelector(`${part1}${part2}x`);
        const ry = document.querySelector(`${part1}${part2}y`);
        const rz = document.querySelector(`${part1}${part2}z`);
        return {
            x,y,z,
            ox,oy,oz,
            sx,sy,sz,
            rx,ry,rz };
    }
// !SECTION
//-------------------------------------
// SECTION - le da cena
    updateWorldSizeFromScene() {
        const elems = this.inputElementsWorldSize();
        const frustum = this.scene.frustum;

        elems.wld_left.value = frustum.left;
        elems.wld_right.value = frustum.right;
        elems.wld_bottom.value = frustum.bottom;
        elems.wld_top.value = frustum.top;
        elems.wld_near.value = frustum.near;
        elems.wld_far.value = frustum.far;

        // console.groupCollapsed('Active world size configuration')
        // console.log(`left: ${elems.wldsz_left.value}`);
        // console.log(`right: ${elems.wldsz_right.value}`);
        // console.log(`bottom: ${elems.wldsz_bottom.value}`);
        // console.log(`top: ${elems.wldsz_top.value}`);
        // console.log(`near: ${elems.wldsz_near.value}`);
        // console.log(`far: ${elems.wldsz_far.value}`);
        // console.groupEnd();
    }

    updateCameraFromScene() {
        const elems = this.inputElementsCamera();
        const camera = this.scene.activeCamera;
        if (!(camera instanceof SceneCamera)) { throw new TypeError('unexpected object retrieved for light.'); }

        elems.up_x.value = camera.upx;
        elems.up_y.value = camera.upy;
        elems.up_z.value = camera.upz;
        elems.cam_x.value = camera.eyex;
        elems.cam_y.value = camera.eyey;
        elems.cam_z.value = camera.eyez;
        elems.target_x.value = camera.targetx;
        elems.target_y.value = camera.targety;
        elems.target_z.value = camera.targetz;
        // elems.espectate.checked = this.scene.orbitCamera;
        // elems.orthogonal.checked = this.scene.camProjection === 'orthogonal' ? true : false;
        // elems.perspective.checked = this.scene.camProjection === 'perspective' ? true : false;

        // const up = camera.up;
        // const eye = camera.eye;
        // const target = camera.target;
        // console.groupCollapsed('Active camera configuration')
        // console.log(`Camera up direction: ${up.toString()}`);
        // console.log(`Lens position: ${eye.toString()}`);
        // console.log(`Target: ${target.toString()}`);
        // console.log(`Espectate: ${elems.espectate.checked.toString()}`);
        // console.log(`Orthogonal projection: ${elems.orthogonal.checked.toString()}`);
        // console.log(`Perspective projection: ${elems.perspective.checked.toString()}`);
        // console.groupEnd();
    }

    updateLightsFromScene() {
        const lights = this.scene.lights;
        const retrievedLigths = new Array(lights.size);

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            if (!(light instanceof SceneLight)) { throw new TypeError('unexpected object retrieved for light.'); }
            retrievedLigths[i] = {
                position: light.position,
                color:light.color,
                intensity:light.intensity};
        }

        const elems = this.inputElementsLights();
        for (let i = 0; i < elems.length; i++) {
            const elem = elems[i];
            const light = retrievedLigths[i];
            elem.x.value = light.position[0];
            elem.y.value = light.position[1];
            elem.z.value = light.position[2];
            elem.i.value = Util.fromPercent(0,100,light.intensity);
        }

        // console.groupCollapsed('Active lights configuration')
        // for (let i = 0; i < retrievedLigths.length; i++) {
        //     console.groupCollapsed(`Light[${i}]`)
        //     console.log(`Position: ${retrievedLigths[i].position.toString()}`);
        //     console.log(`Color: ${retrievedLigths[i].color.toString()}`);
        //     console.log(`Intensity: ${retrievedLigths[i].intensity.toString()}`);
        //     console.groupEnd();
        // }
        // console.groupEnd();
    }

    updateAddedModelsFromScene() {
        const scene = this.scene;
        const models = this.scene.models;
        const addedModels = document.querySelector("#addedModels");
        const template = document.querySelector("#modelTemplate");

        // NOTE - erasing old models cards
        while (addedModels.firstChild) {
            addedModels.removeChild(addedModels.firstChild);
        }

        // NOTE- for each model in the scene generate a card
        for (let iModel = 0; iModel < models.length; iModel++) {
            const model = models[iModel];
            if (!(model instanceof Model3D)) { throw new TypeError("unexpected object retrieved for model"); }
            const aClone = template.content.firstElementChild.cloneNode(true);
            if (!(aClone instanceof Element)) { throw new TypeError("unexpected object retrieved for form template."); }

            const submitEventHandler = function (event) {
                event.preventDefault();  // NOTE - don't submit the form
                this.updateSceneAddedModel(iModel);
            };
            const removeModelEventHandler = function (event) {
                aClone.removeEventListener('submit', submitEventHandler);
                this.removeEventListener('click', removeModelEventHandler);
                aClone.parentElement.removeChild(aClone);
                const aModelNumber = parseInt(aClone.querySelector("span.modelN").textContent);
                scene.removeModel(aModelNumber);
            };
            aClone.addEventListener('submit', submitEventHandler.bind(this));
            aClone.querySelector("button.removeModel").addEventListener('click', removeModelEventHandler);

            aClone.querySelector("span.modelN").textContent = iModel;
            const fieldsets = aClone.querySelectorAll("fieldset");
            const inTypes = ["x","y","z"];
            for (let iFieldset = 0; iFieldset < fieldsets.length; iFieldset++) {
                const fieldset = fieldsets[iFieldset];
                const inputs = fieldset.querySelectorAll("input");
                if (iFieldset === 0) {  // NOTE - first fieldset is origin
                    for (let iInput = 0; iInput < inputs.length; iInput++) {
                        const input = inputs[iInput];
                        const name = `mdl${iModel}orig${inTypes[iInput]}`;
                        input.id = name;
                        input.name = name;
                        input.value = model.origin[iInput]
                    }
                }
                if (iFieldset === 1) {  // NOTE - second fieldset is position
                    for (let iInput = 0; iInput < inputs.length; iInput++) {
                        const input = inputs[iInput];
                        const name = `mdl${iModel}pos${inTypes[iInput]}`;
                        input.id = name;
                        input.name = name;
                        input.value = model.position[iInput]
                    }
                }
                if (iFieldset === 2) {  // NOTE - third fieldset is scale
                    for (let iInput = 0; iInput < inputs.length; iInput++) {
                        const input = inputs[iInput];
                        const name = `mdl${iModel}scl${inTypes[iInput]}`;
                        input.id = name;
                        input.name = name;
                        input.value = model.scale[iInput]
                    }
                }
                if (iFieldset === 3) {  // NOTE - fourth fieldset is rotation
                    for (let iInput = 0; iInput < inputs.length; iInput++) {
                        const input = inputs[iInput];
                        const name = `mdl${iModel}rot${inTypes[iInput]}`;
                        input.id = name;
                        input.name = name;
                        input.value = model.rotation[iInput]
                    }
                }
            }
            addedModels.appendChild(aClone);
        }
    }

// !SECTION
//-------------------------------------
// SECTION - escreve na cena
    updateSceneWorldSize() {
        const elems = this.inputElementsWorldSize();
        const frustum = this.scene.frustum;
        const left = parseFloat(elems.wld_left.value ? elems.wld_left.value : 0.0);
        const right = parseFloat(elems.wld_right.value ? elems.wld_right.value : 0.0);
        const bottom = parseFloat(elems.wld_bottom.value ? elems.wld_bottom.value : 0.0);
        const top = parseFloat(elems.wld_top.value ? elems.wld_top.value : 0.0);
        const near = parseFloat(elems.wld_near.value ? elems.wld_near.value : 0.0);
        const far = parseFloat(elems.wld_far.value ? elems.wld_far.value : 0.0);

        frustum.left = left;
        frustum.right = right;
        frustum.bottom = bottom;
        frustum.top = top;
        frustum.near = near;
        frustum.far = far;
    }

    updateSceneCamera() {
        const elems = this.inputElementsCamera();
        const camera = this.scene.activeCamera;

        camera.upx = parseFloat(elems.up_x.value ? elems.up_x.value : 0.0);
        camera.upy = parseFloat(elems.up_y.value ? elems.up_y.value : 0.0);
        camera.upz = parseFloat(elems.up_z.value ? elems.up_z.value : 0.0);
        camera.eyex = parseFloat(elems.cam_x.value ? elems.cam_x.value : 0.0);
        camera.eyey = parseFloat(elems.cam_y.value ? elems.cam_y.value : 0.0);
        camera.eyez = parseFloat(elems.cam_z.value ? elems.cam_z.value : 0.0);
        camera.targetx = parseFloat(elems.target_x.value ? elems.target_x.value : 0.0);
        camera.targety = parseFloat(elems.target_y.value ? elems.target_y.value : 0.0);
        camera.targetz = parseFloat(elems.target_z.value ? elems.target_z.value : 0.0);
        this.scene.orbitCamera = elems.espectate.checked;

        this.scene.camProjection = elems.orthogonal.checked ? 'orthogonal' : 'perspective';

        if (elems.espectate.checked && (!this.idInterval)) {
            this.idInterval = setInterval(this.updateCameraFromScene.bind(this), 100);
        }
        else if ((!elems.espectate.checked) && this.idInterval) {
            clearInterval(this.idInterval);
            this.idInterval = null;
        }
    }

    updateSceneLights() {
        const elems = this.inputElementsLights()
        const lights = [
            { x: elems[0].x, y: elems[0].y, z: elems[0].z, i: elems[0].i },
            { x: elems[1].x, y: elems[1].y, z: elems[1].z, i: elems[1].i },
            { x: elems[2].x, y: elems[2].y, z: elems[2].z, i: elems[2].i },
            { x: elems[3].x, y: elems[3].y, z: elems[3].z, i: elems[3].i },
            { x: elems[4].x, y: elems[4].y, z: elems[4].z, i: elems[4].i }];

        for (let iLight = 0; iLight < lights.length; iLight++) {
            const readLight = lights[iLight];
            const targetLight = this.scene.lights[iLight];
            if (!(targetLight instanceof SceneLight)) { throw new TypeError("unexpected object retrieved for targetLight."); }

            targetLight.x = parseFloat(readLight.x.value ? readLight.x.value : 0.0);
            targetLight.y = parseFloat(readLight.y.value ? readLight.y.value : 0.0);
            targetLight.z = parseFloat(readLight.z.value ? readLight.z.value : 0.0);
            targetLight.intensity = parseFloat(readLight.i.value ? readLight.i.value : 0.0)/100.0;
        }
    }

    updateSceneAddedModel(nModel) {
        const elems = this.inputElementsAddedModel(nModel);
        const targetModel = this.scene.models[nModel];
        if(!(targetModel instanceof Model3D)) { throw new TypeError("unexpected object retrieved for targetModel."); }

        targetModel.x = parseFloat(elems.x.value ? elems.x.value : 0.0);
        targetModel.y = parseFloat(elems.y.value ? elems.y.value : 0.0);
        targetModel.z = parseFloat(elems.z.value ? elems.z.value : 0.0);
        targetModel.ox = parseFloat(elems.ox.value ? elems.ox.value : 0.0);
        targetModel.oy = parseFloat(elems.oy.value ? elems.oy.value : 0.0);
        targetModel.oz = parseFloat(elems.oz.value ? elems.oz.value : 0.0);
        targetModel.sx = parseFloat(elems.sx.value ? elems.sx.value : 0.0);
        targetModel.sy = parseFloat(elems.sy.value ? elems.sy.value : 0.0);
        targetModel.sz = parseFloat(elems.sz.value ? elems.sz.value : 0.0);
        targetModel.rx = parseFloat(elems.rx.value ? elems.rx.value : 0.0);
        targetModel.ry = parseFloat(elems.ry.value ? elems.ry.value : 0.0);
        targetModel.rz = parseFloat(elems.rz.value ? elems.rz.value : 0.0);

    }
// !SECTION
//-------------------------------------
}
