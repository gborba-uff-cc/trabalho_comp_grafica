export class Util {
    static get MathJs() {
        // LINK - mathjs.org MathJs
        return window.math;
    }

    static get glMatrix() {
        return window.glMatrix;
    }

    // SECTION - Algebra

    static get identity4() {
        return [[1,0,0,0],
                [0,1,0,0],
                [0,0,1,0],
                [0,0,0,1]];
    }

    static multiply(A, B) {
        if (!((A instanceof Array) && (A[0] instanceof Array))) {
            throw TypeError('Util.multiply: A is not a matrix.')
        }
        if (!((B instanceof Array) && (B[0] instanceof Array))) {
            throw TypeError('Util.multiply: B is not a matrix.')
        }
        return A.map((row, i) =>
            B[0].map((_, j) =>
                row.reduce((acc, _, n) =>
                    acc + A[i][n] * B[n][j], 0
                )
            )
        );
    }

    static dot(a, b) {
        if (!(a instanceof Array)) {
            throw TypeError('Util.dot: a is not a vector.');
        }
        if (!(b instanceof Array)) {
            throw TypeError('Util.dot: b is not a vector.');
        }
        if (a.length != b.length) {
            throw RangeError(`Util.dot: a and b does not have the same dimension.`)
        }
        let acc = 0.0;
        for (let i = 0; i < a.length; i++) {
            acc += a[i]*b[i];
        }
        return acc;
    }

    static cross(a, b) {
        if (!(a instanceof Array)) {
            throw TypeError('Util.dot: a is not a vector.');
        }
        if (!(b instanceof Array)) {
            throw TypeError('Util.dot: b is not a vector.');
        }
        if ((a.length != 3) || (b.length != 3)) {
            throw RangeError('Util.dot: a or b does not have 3 dimensions.')
        }
        return [
            a[1]*b[2]-a[2]*b[1],
            a[0]*b[2]-a[2]*b[0],
            a[0]*b[1]-a[1]*b[0]];
    }
    // !SECTION

    // SECTION - Functions opengl
    // SECTION - Transformations
    static cpuScale(sx, sy, sz, inM) {
        return this.multiply(
            [[sx,0,0,0],[0,sy,0,0],[0,0,sz,0],[0,0,0,1]],
            inM);
    }

    static cpuTranslate(tx, ty, tz, inM) {
        return this.multiply(
            [[1,0,0,tx],[0,1,0,ty],[0,0,1,tz],[0,0,0,1]],
            inM);
    }

    static cpuRotate(rx, ry, rz, inM) {
        const matRx = [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, Math.cos(rx), -Math.sin(rx), 0.0],
            [0.0, Math.sin(rx),  Math.cos(rx), 0.0],
            [0.0, 0.0, 0.0, 1.0]];
        const matRy = [
            [ Math.cos(ry), 0.0, Math.sin(ry), 0.0],
            [0.0, 1.0, 0.0, 0.0],
            [-Math.sin(ry), 0.0, Math.cos(ry), 0.0],
            [0.0, 0.0, 0.0, 1.0]];
        const matRz = [
            [Math.cos(rz), -Math.sin(rz), 0.0, 0.0],
            [Math.sin(rz), Math.cos(rz), 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]];
        const matR = this.multiply(matRz, this.multiply(matRy, matRx));
        return this.multiply(matR,inM);
    }

    static cpuLookAt(outM, inM, eye, at, up) {
        // TODO
    }
    // !SECTION - Transformations

    // SECTION - Projections
    static orthogonalProjection(outM,left,right,bottom,top,near,far) {
        near = near * -1;
        far = far * -1;
        // // NOTE - transladar o centro da cena para o centro do volume de visão do opengl
        // T = (-(right+left)/2,-(top+bottom)/2,(far+near)/2)^(T);
        // // NOTE - escalar o mundo
        // S = S(2/(right-left),2/(top-bottom),2/(near-far))
        // proj = S*T
        // st = [[2/(right-left),              0,               0, -(right+left)/(right-left)],
        //         [             0, 2/(top-bottom),               0, -(top+bottom)/(top-bottom)],
        //         [             0,              0, -2/(far-bottom),     -(far+near)/(far-near)],
        //         [             0,              0,               0,                          1]];
        // return st;
    outM[0][0] = 2/(right-left);
    outM[0][1] = 0;
    outM[0][2] = 0;
    outM[0][3] = -(right+left)/(right-left);
    outM[1][0] = 0;
    outM[1][1] = 2/(top-bottom);
    outM[1][2] = 0;
    outM[1][3] = -(top+bottom)/(top-bottom);
    outM[2][0] = 0;
    outM[2][1] = 0;
    outM[2][2] = -2/(far-near);
    outM[2][3] = -(far+near)/(far-near);
    outM[3][0] = 0;
    outM[3][1] = 0;
    outM[3][2] = 0;
    outM[3][3] = 1;
    }

    static perspectiveProjection(outM,fovy,aspectRatio,near,far) {
        const top = near * Math.tan(fovy/2);
        const bottom = -top;
        const right = top*aspectRatio;
        const left = -right;
        const rightMinusLeft = right - left;
        const rightPlusLeft = right + left;
        const topMinusBottom = top - bottom;
        const topPlusBottom = top + bottom;
        const farMinusNear = far - near;
        const farPlusNear = far + near;

        outM[0][0] = (2*near)/(rightMinusLeft);
        outM[0][1] = 0;
        outM[0][2] = (rightPlusLeft)/(rightMinusLeft);
        outM[0][3] = 0;
        outM[1][0] = 0;
        outM[1][1] = (2*near)/(topMinusBottom);
        outM[1][2] = (topPlusBottom)/(topMinusBottom);
        outM[1][3] = 0;
        outM[2][0] = 0;
        outM[2][1] = 0;
        outM[2][2] = -(farPlusNear)/(farMinusNear);
        outM[2][3] = (-2*far*near)/(farMinusNear);
        outM[3][0] = 0;
        outM[3][1] = 0;
        outM[3][2] = -1;
        outM[3][3] = 0;
    }
    // !SECTION - Projections

    static array2DTo1D(matrix) {
        if (matrix instanceof Array) {
            return matrix.flat();
        }
    }
    // !SECTION - Functions opengl

    // SECTION - Means
    static mediamovelacumulativa(mma, valores_considerados, novo_valor) {
        return mma + ((novo_valor - mma) / valores_considerados);
    }

    static mediamovelexponencial(mme, alpha, novo_valor) {
        return (alpha * novo_valor) + (1.0 - alpha) * mme;
    }
    // !SECTION

    static toPercent(a,b,x) {
        return (x-a)/(b-a);
    }

    static fromPercent(a,b,x) {
        return x*(b-a)+a;
    }
}
