import { Model3D } from "./model3D.js";
import { Shader } from "./shader.js";

/*
handles only properties with property-name lastly:

element <element-name> <number-in-file>
property <data-type> <property-name-1>
property <data-type> <property-name-2>
property <data-type> <property-name-3>
...

OR

property list <numerical-type> <numerical-type> <property-name>

*/

class PlyObject {
    constructor() {
        this.elements = [];
    }

    getDataArrayOf(dataElementName, ...desiredPropriertiesName) {
        // NOTE - finds the element of interest
        const dataElem = this.elements.find((dataElem) => dataElem.name == dataElementName);
        return dataElem.getDataArrayOf(...desiredPropriertiesName);
    }
}

class PlyDataElement {
    constructor() {
        this.name = "";
        this.properties = [];
        this.elementsNumber = 0;
        this.elements = [];
    }

    get elementsTypes() {
        const types = [];
        for (const property of this.properties) {
            if (property.isList) {
                types.push([property.indiceType, property.valueType]);
            }
            else {
                types.push(property.valueType);
            }
        }
        return types;
    }

    get propertiesNames() {
        const names = [];
        for (const property of this.properties) {
            names.push(property.name);
        }
        return names;
    }

    getDataArrayOf(...desiredPropriertiesName) {
        // NOTE - finds indices of the properties of interest
        const propertiesPos = [];
        const propertiesType = [];
        let pos = -1;
        let type = '';
        for (let i = 0; i < desiredPropriertiesName.length; i++) {
            pos = this.properties.findIndex((prop) => desiredPropriertiesName[i] == prop.name);
            // NOTE - throw an error if property was not found
            let propName = desiredPropriertiesName[i];
            if (pos < 0 && (typeof propName === 'strig')) {
                throw new ReferenceError(`in PlyObject.getDataArrayOf(). Porperty ${desiredPropriertiesName[1]} not found.`);
            }
            // NOTE - letting propertyName other thar string slip on purpose
            else if (pos >= 0 && (typeof propName === 'string')){
                type = this.properties[pos].valueType;
                propertiesPos.push(pos);
                propertiesType.push(type);
            }
        }
        type = propertiesType[0];
        // NOTE - throw an error if there is at least one type diferent from the others
        const allSameType = propertiesType.every((t) => type == t);
        if (!allSameType) {
            throw new TypeError('in PlyObject.getDataArrayOf(). properties requested are not all the same type');
        }
        // NOTE - retrieve the values
        const acc = [];
        let iPropPosFound;
        let iDesiredProps;
        let desiredProp;
        let elem;
        for (let iLine = 0; iLine < this.elements.length; iLine++) {
            const line = this.elements[iLine];
            iPropPosFound = 0;
            iDesiredProps = 0;
            desiredProp = null;
            while (iDesiredProps < desiredPropriertiesName.length) {
                desiredProp = desiredPropriertiesName[iDesiredProps];
                if (typeof desiredProp !== 'string') {
                    acc.push(desiredProp);
                }
                else {
                    elem = line[propertiesPos[iPropPosFound]];
                    if (elem instanceof Array) {
                        elem = elem.slice(1);
                    }
                    acc.push(elem);
                    iPropPosFound += 1;
                }
                iDesiredProps += 1;
            }
        }
        // NOTE- convert to the needed ArrayType
        return new (_arrayTypeNeeded(type))(acc.flat());
    }
}

class PlyProperty {
    constructor() {
        this.isList = false;
        this.indiceType = "";
        this.valueType = "";
        this.name = "";
    }
}

export function model3DFromPlyObject(plyObject) {
    if (!(plyObject instanceof PlyObject)) { throw new TypeError('in handlerPly.Model3dFromPlyObject()'); }
    const aModel = new Model3D();

    let dataElem;
    for (let i = 0; i < plyObject.elements.length; i++) {
        dataElem = plyObject.elements[i];
        if (!(dataElem instanceof PlyDataElement)) { throw new TypeError('in handlerPly.Model3dFromPlyObject()'); }

        // NOTE - mandatory
        if (dataElem.name === 'vertex') {
            aModel.vaoInfos.vertexArray = dataElem.getDataArrayOf('x','y','z',1.0);
        }
        // NOTE - skippable
        if (dataElem.name === 'vertex') {
            try {
                aModel.vaoInfos.normalsArray = dataElem.getDataArrayOf('nx','ny','nz',1.0);
            } catch (error) {
                if (error instanceof ReferenceError) {
                    // console.log(error)
                    aModel.vaoInfos.normalsArray = null;
                }
            }
        }
        // NOTE - skippable
        if (dataElem.name === 'vertex') {
            try {
                aModel.vaoInfos.colorsBuffer = dataElem.getDataArrayOf('red','green','blue',1.0);
            } catch (error) {
                if (error instanceof ReferenceError) {
                    // console.log(error)
                    aModel.vaoInfos.colorsArray;
                }
            }
        }
        // NOTE - mandatory
        if (dataElem.name === 'face') {
            let propName = 'vertex_indices';
            if (!(dataElem.propertiesNames.includes(propName))) {
                propName = 'vertex_index';
            }
            aModel.vaoInfos.vertexIndexesArray = dataElem.getDataArrayOf(propName);
        }
    }
    return aModel;
}

export function parsePly(text) {
    const aPlyObject = new PlyObject();
    const lines = text.split("\n");

    if (lines[0] != "ply" || lines[1] != "format ascii 1.0") {
        return aPlyObject;
    }
    // NOTE - read the header
    const aux = _readPlyHeader(lines);
    // NOTE - read the values
    _readPlyValues(lines, aux.headerSize, aux.dataElements);
    aPlyObject.elements = aux.dataElements;
    return aPlyObject;
}

function _readPlyHeader(lines) {
    const dataElements = [];
    let lineNumber = 0;
    for (lineNumber = 2; lines[lineNumber] != "end_header"; lineNumber++) {
        const line = lines[lineNumber];
        if (typeof line !== 'string') {
            throw new TypeError("Unexpected type on handlerPly._readPlyHeader");
        }
        if (line.startsWith("comment")) {
            continue;
        }
        else if (line.startsWith("element")) {
            const aPlyElement = new PlyDataElement();
            const elemTokens = line.split(" ");
            aPlyElement.name = elemTokens[1];
            aPlyElement.elementsNumber = parseInt(elemTokens[2]);

            // NOTE - lê a proxima linha
            lineNumber++;
            let nextLine = lines[lineNumber];
            let propsTokens;
            // TODO - change to while loops (read until)
            // TODO - read line; split tokens; if list ...; else ...;
            // NOTE - identify property such "property list <indexType> <valueType> <name>"
            if (nextLine.startsWith("property list")) {
                const aPlyProperty = new PlyProperty();

                aPlyProperty.isList = true;
                propsTokens = nextLine.split(" ");
                // NOTE - tipo do dado para os indices
                aPlyProperty.indiceType = propsTokens[2];
                // NOTE - tipo do dado para os valores
                aPlyProperty.valueType = propsTokens[3]
                // NOTE - nome da propriedade
                aPlyProperty.name = propsTokens[4]

                aPlyElement.properties.push(aPlyProperty);
            }
            else {
                while (nextLine.startsWith("property")) {
                    const aPlyProperty = new PlyProperty();

                    aPlyProperty.isList = false;
                    propsTokens = nextLine.split(" ");
                    // NOTE - tipo do dado para o valor
                    aPlyProperty.valueType = propsTokens[1]
                    // NOTE - nome da propriedade
                    aPlyProperty.name = propsTokens[2]
                    aPlyElement.properties.push(aPlyProperty);

                    lineNumber++;
                    nextLine = lines[lineNumber];
                }
                /* NOTE -
                ao sair do while, lineNumber já estará referenciando uma linha que não foi
                processada, o loop for vai incrementar a variavel novamente.
                É preciso decrementar o valor de lineNumber ao sair do loop.
                */
                lineNumber--;
            }
            dataElements.push(aPlyElement);
        }
    }
    return {dataElements, headerSize: lineNumber};
}

function _readPlyValues(lines, iLineStart,dataElements) {
    let iDataElement = 0;
    let lineNumber = iLineStart+1;
    let nElemRead = 0;
    //
    for (iDataElement = 0; iDataElement < dataElements.length; iDataElement += 1) {
        const aPlyElement = dataElements[iDataElement];
        if (!(aPlyElement instanceof PlyDataElement)) {
            throw new TypeError("Unexpected Type in handlerPly._readPlyValues.");
        }
        const typesOfProperty = aPlyElement.elementsTypes;

        nElemRead = 0;
        while (nElemRead < aPlyElement.elementsNumber) {
            const line = lines[lineNumber];
            if (!line) {
                nElemRead += 1;
                continue;
            }
            // NOTE - split the line on tokens
            const tokens = line.split(" ");
            // NOTE - values of a line after parsed
            const lineParsed = [];
            // SECTION - parse the values
            // NOTE - index on list of tokens
            let iToken = 0;
            // NOTE - index on list of types for tokens
            let iValue = 0;

            while ( iToken < tokens.length) {
                // NOTE - read property such "property list <indexType> <valueType> <name>"
                if (typesOfProperty[iToken] instanceof Array) {
                    const nElemList = _parseDataValue(typesOfProperty[iValue][0],tokens[iToken]);
                    // NOTE - index of the last
                    let iFininsh = iValue+nElemList;
                    const subList = [];
                    while (iToken <= iFininsh) {
                        subList.push(_parseDataValue(typesOfProperty[iValue][1],tokens[iToken]));
                        iToken += 1;
                    }
                    lineParsed.push(subList);
                }
                // NOTE - read the property of type "property <type>"
                else {
                    lineParsed.push(_parseDataValue(typesOfProperty[iValue],tokens[iToken]));
                }
                iValue += 1;
                iToken += 1;
            }
            // !SECTION
            dataElements[iDataElement].elements.push(lineParsed);
            nElemRead += 1;
            lineNumber += 1;
        }
    }
}

function _parseDataValue(type, text) {
    if (['char','uchar','short','ushort','int','uint'].includes(type)) {
        return parseInt(text);
    }
    else if (['float','double'].includes(type)) {
        return parseFloat(text);
    }
}


function _arrayTypeNeeded(typeName) {
    const name = typeName.toLowerCase();
    switch (name) {
    case 'char':
        return Int8Array;
    case 'uchar':
        return Uint8Array;
    case 'short':
        return Int16Array;
    case 'ushort':
        return Uint16Array;
    case 'int':
        return Int32Array;
    case 'uint':
        return Uint32Array;
    case 'float':
        return Float32Array;
    case 'double':
        return Float64Array;
    default:
        console.log(name);
        throw new TypeError('in _arrayTypeNeeded(). invalid type needed.');
    }
}

// const stringTest = `\
// ply
// format ascii 1.0
// comment made by Greg Turk
// comment this file is a cube
// element vertex 8
// property float x
// property float y
// property float z
// element face 6
// property list uchar int vertex_indices
// end_header
// 0 0 0
// 0 0 1
// 0 1 1
// 0 1 0
// 1 0 0
// 1 0 1
// 1 1 1
// 1 1 0
// 4 0 1 2 3
// 4 7 6 5 4
// 4 0 4 5 1
// 4 1 5 6 2
// 4 2 6 7 3
// 4 3 7 4 0
// `;
// console.log(stringTest);
// const parsed = parsePly(stringTest);
// console.log(parsed);
// const model = model3DFromPlyObject(parsed);
// console.log(model);
