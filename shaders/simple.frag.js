export default
`\
#version 300 es
precision highp float;

#define MAX_LIGHTS 5
#define LIGHT_LEN 8
#define MATERIAL_LEN 4
#define CAMERA_LEN 9

struct IluminationInfo
{
    vec4 position;
    vec4 color;
    float intensity;
    float kA;
    float kD;
    float kS;
    float rS;
};

struct CameraInfo {
    vec4 eye;
    vec4 target;
    vec4 up;
};

in vec4 vPosModelView;
in vec4 vNrmModelView;
in vec4 vColor;

uniform float uModelMaterial[MATERIAL_LEN];
uniform mat4 uMatModel;
uniform mat4 uMatView;
uniform mat4 uMatProj;

// NOTE - n sources of light, each with m floats to be described
uniform float uLightsData[MAX_LIGHTS*LIGHT_LEN];
uniform float uCameraData[CAMERA_LEN];

out vec4 fColor;

void main()
{
    vec4 debugResponse;
    vec4 lightTransformation = vec4(0.0);
    vec4 ambientLight = vec4(0.0);
    float ambientTotalIntensity = 0.0;

    CameraInfo cam;
    cam.eye = vec4(uCameraData[0],uCameraData[1],uCameraData[2],1.0);
    cam.target = vec4(uCameraData[3],uCameraData[4],uCameraData[5],1.0);
    cam.up = vec4(uCameraData[6],uCameraData[7],uCameraData[8],1.0);
    IluminationInfo ilumInfo;
    ilumInfo.kA = uModelMaterial[0];
    ilumInfo.kD = uModelMaterial[1];
    ilumInfo.kS = uModelMaterial[2];
    ilumInfo.rS = uModelMaterial[3];

    for (int i = 0; i < MAX_LIGHTS*LIGHT_LEN; i += LIGHT_LEN) {
        // NOTE - retrieve IlumitaionInfo
        ilumInfo.position = vec4(uLightsData[i+0],uLightsData[i+1],uLightsData[i+2],1.0);
        ilumInfo.color = vec4(uLightsData[i+3],uLightsData[i+4],uLightsData[i+5],uLightsData[i+6]);
        ilumInfo.intensity = uLightsData[i+7];

        // NOTE - difuse
        vec4 lightPosView = uMatView * ilumInfo.position;
        float lightDist = distance(lightPosView, vPosModelView);
        vec4 lightDir = normalize(lightPosView - vPosModelView);
        float iD = max(0.0, dot(lightDir, vNrmModelView));

        // NOTE - specular {specular reference is the camera}
        // NOTE - cameraPos should be on camera coordinate system
        vec4 cameraPos = uMatView*cam.eye;
        vec4 cameraDir = normalize(cameraPos - vPosModelView);
        vec4 halfVector= normalize(lightDir + cameraDir);
        // NOTE - divided by the product of lenght from both vectors
        // (which in turn is 1 when both are normalized)
        float cosnVhV = dot(vNrmModelView, halfVector);
        float iS = pow(max(0.0, cosnVhV), ilumInfo.rS);

        // NOTE- 1/(ax^2+bx+c) where x is the distance from light to point being iluminated
        float decay = 1.0/(0.001*pow(lightDist,2.0) +0.01*lightDist +1.0);

        lightTransformation += (ilumInfo.kA+ilumInfo.kD*iD+ilumInfo.kS*iS)*(ilumInfo.intensity*decay)*ilumInfo.color;

        // if (i == 0*LIGHT_LEN) {
        //     debugResponse = vec4(0.0,0.0,1.0,1.0);
        //     if (ilumInfo.kD == 0.0) {
        //         // debugResponse = vec4(iS*vec3(0.0,1.0,0.0),1.0);
        //         debugResponse = vec4(0.0,1.0,0.0,1.0);
        //     }
        //     else {
        //         debugResponse = vec4(1.0,0.0,0.0,1.0);
        //     }
        // }
    }

    fColor = vec4(lightTransformation.rgb,1.0) * vColor;

    // NOTE - gamma correction
    float gamma = 1.3;
    vec3 gammaCorrected = pow(fColor.rgb, vec3(gamma));
    fColor = fColor * vec4(gammaCorrected,1.0);

    // fColor = debugResponse;
}
`