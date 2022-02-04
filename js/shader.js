export class Shader {
    static createShader(gl, type, source) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Shader.createShader()'); }

        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            console.log(`Could not compile WebGl shader: ${info}`);
        }

        return shader;
    }

    static createProgram(gl, vertexShader, fragmentShader) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Shader.createProgram()'); }

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            console.log(`Could not compile WebGl program: ${info}`);
        }

        return program;
    }

    static isArrayBuffer(value) {
        return value && value.buffer instanceof ArrayBuffer && value.byteLength !== undefined;
    }

    static createBuffer(gl, type, data) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Shader.createVAO()'); }

        if (data.length == 0) {
            return null;
        }

        if (!Shader.isArrayBuffer(data)) {
            console.log('data is not an instance of ArrayBuffer');
            return null;
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(type, buffer);
        gl.bufferData(type, data, gl.STATIC_DRAW);

        return buffer;
    }

    static createVAO(gl, posAttribLoc, posBuffer, colorAttribLoc = null, colorBuffer = null, normAttribLoc = null, normBuffer = null) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Shader.createVAO()'); }

        const vao = gl.createVertexArray();

        gl.bindVertexArray(vao);

        if (posAttribLoc != null && posAttribLoc != undefined) {
            gl.enableVertexAttribArray(posAttribLoc);
            // const size = 4;
            // const type = gl.FLOAT;
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
            // gl.vertexAttribPointer(size, type, false, 0, 0);
            gl.vertexAttribPointer(posAttribLoc , 4, gl.FLOAT, false, 0, 0);
        }

        if (colorAttribLoc != null && colorAttribLoc != undefined) {
            gl.enableVertexAttribArray(colorAttribLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.vertexAttribPointer(colorAttribLoc , 4, gl.FLOAT, false, 0, 0);
        }

        if (normAttribLoc != null && normAttribLoc != undefined) {
            gl.enableVertexAttribArray(normAttribLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
            gl.vertexAttribPointer(normAttribLoc , 4, gl.FLOAT, false, 0, 0);
        }

        return vao;
    }

    static createVAO2(gl, aVaoInfos) {
        if (!(gl instanceof WebGL2RenderingContext)) { throw new TypeError('in Shader.createVAO2()'); }
        if (!(aVaoInfos instanceof VAOInfos)) { throw new TypeError('in Shader.createVAO2()'); }

        const vao = gl.createVertexArray();

        gl.bindVertexArray(vao);

        if (aVaoInfos.vertexAttribLoc > -1 && aVaoInfos.vertexBuffer) {
            gl.enableVertexAttribArray(aVaoInfos.vertexAttribLoc);
            // const size = 4;
            // const type = gl.FLOAT;
            gl.bindBuffer(gl.ARRAY_BUFFER, aVaoInfos.vertexBuffer);
            // gl.vertexAttribPointer(size, type, false, 0, 0);
            gl.vertexAttribPointer(aVaoInfos.vertexAttribLoc , 4, gl.FLOAT, false, 0, 0);
        }
        else {
            throw new ReferenceError('in Shader.createVAO2()');
        }

        if (aVaoInfos.vertexIndexesArray) {
            const buffer = this.createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, aVaoInfos.vertexIndexesArray);
            aVaoInfos.vertexIndexesBuffer = buffer;
            aVaoInfos.vertexIndexesBufferGlType = Shader.glIndexTypeFromArrayType(gl, aVaoInfos.vertexIndexesArray);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, aVaoInfos.vertexIndexesBuffer);
        }

        if (aVaoInfos.normalsAttribLoc > -1 && aVaoInfos.normalsBuffer) {
            gl.enableVertexAttribArray(aVaoInfos.normalsAttribLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, aVaoInfos.normalsBuffer);
            gl.vertexAttribPointer(aVaoInfos.normalsAttribLoc , 4, gl.FLOAT, false, 0, 0);
        }

        if (aVaoInfos.colorsAttribLoc > -1 && aVaoInfos.colorsBuffer) {
            gl.enableVertexAttribArray(aVaoInfos.colorsAttribLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, aVaoInfos.colorsBuffer);
            gl.vertexAttribPointer(aVaoInfos.colorsAttribLoc , 4, gl.FLOAT, false, 0, 0);
        }

        return vao;
    }

    static glIndexTypeFromArrayType(gl, array) {
        if (array instanceof Int8Array) { return gl.UNSIGNED_BYTE; }
        else if (array instanceof Uint8Array) { return gl.UNSIGNED_BYTE; }
        else if (array instanceof Int16Array) { return gl.UNSIGNED_SHORT; }
        else if (array instanceof Uint16Array) { return gl.UNSIGNED_SHORT; }
        else if (array instanceof Int32Array) { return gl.UNSIGNED_INT; }
        else if (array instanceof Uint32Array) { return gl.UNSIGNED_INT; }
    }
}

export class VAOInfos {
    constructor () {
        this.vertexArray = null;
        this.vertexAttribLoc = null;
        this.vertexBuffer = null;

        this.vertexIndexesArray = null;
        this.vertexIndexesBuffer = null;
        this.vertexIndexesBufferGlType = null;

        this.normalsArray = null;
        this.normalsAttribLoc = null;
        this.normalsBuffer = null;

        this.colorsArray = null;
        this.colorsAttribLoc = null;
        this.colorsBuffer = null;

        this.vaoLoc = null;
    }
}

// export function identificaErro(gl) {
//     if (!(gl instanceof WebGL2RenderingContext)) {return}
//     const aux = gl.getError();
//     let strErro;
//     switch (aux) {
//     case gl.NO_ERROR:
//         strErro = 'No error has been recorded. The value of this constant is 0.';
//         return;
//     case gl.INVALID_ENUM:
//         strErro = 'An unacceptable value has been specified for an enumerated argument. The command is ignored and the error flag is set.';
//         break;
//     case gl.INVALID_VALUE:
//         strErro = 'A numeric argument is out of range. The command is ignored and the error flag is set.';
//         break;
//     case gl.INVALID_OPERATION:
//         strErro = 'The specified command is not allowed for the current state. The command is ignored and the error flag is set.';
//         break;
//     case gl.INVALID_FRAMEBUFFER_OPERATION:
//         strErro = 'The currently bound framebuffer is not framebuffer complete when trying to render to or to read from it.';
//         break;
//     case gl.OUT_OF_MEMORY:
//         strErro = 'Not enough memory is left to execute the command.';
//         break;
//     case gl.CONTEXT_LOST_WEBGL:
//         strErro = 'If the WebGL context is lost, this error is returned on the first call to getError. Afterwards and until the context has been restored, it returns gl.NO_ERROR.';
//         break;
//     }
//     console.log(strErro);
// }
