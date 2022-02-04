export default
`\
#version 300 es
precision highp float;

// NOTE - in/out variables doesn't spread across th pipeline ==================
in vec4 position;
in vec4 normal;
in vec4 color;

uniform mat4 uMatModel;
uniform mat4 uMatView;
uniform mat4 uMatProj;

out vec4 vPosModelView;
out vec4 vNrmModelView;
out vec4 vColor;
// =============================================================================

void main()
{
    mat4 modelView = uMatView * uMatModel;

    vPosModelView = modelView * position;

    // NOTE - correcting normals based onview and model transformations

    vNrmModelView = transpose(inverse(modelView)) * normalize(normal);//normal;

    vColor = color;

    gl_Position = uMatProj * vPosModelView;
}
`