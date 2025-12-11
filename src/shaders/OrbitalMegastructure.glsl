#version 300 es
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform sampler2D iChannel2; // Noise/Terrain texture

out vec4 fragColor;

// --- COMMON BLOCK START ---
#define saturate(a) clamp(a, 0.0, 1.0)
const float PI=3.14159265;

// Optimization: Removed ZERO_TRICK, standard loops are fine for WebGL2
#define ZERO_TRICK 0

vec2 Rotate(vec2 v, float rad)
{
  float cos = cos(rad);
  float sin = sin(rad);
  return vec2(cos * v.x - sin * v.y, sin * v.x + cos * v.y);
}
vec3 RotateX(vec3 v, float rad)
{
  float cos = cos(rad);
  float sin = sin(rad);
  return vec3(v.x, cos * v.y + sin * v.z, -sin * v.y + cos * v.z);
}
vec3 RotateY(vec3 v, float rad)
{
  float cos = cos(rad);
  float sin = sin(rad);
  return vec3(cos * v.x - sin * v.z, v.y, sin * v.x + cos * v.z);
}
vec3 RotateZ(vec3 v, float rad)
{
  float cos = cos(rad);
  float sin = sin(rad);
  return vec3(cos * v.x + sin * v.y, -sin * v.x + cos * v.y, v.z);
}

// ---- Random functions ----
// Using a simpler hash for performance where possible, but keeping original logic for visual consistency
// Global state simulation for random (less ideal for parallel, but keeping logic structure)
// We will pass simplified seeds for procedural textures to avoid global state issues in pure functions

// 0xffffff is biggest 2^n-1 that 32 bit float does exactly.
const float invMax24Bit = 1.0 / float(0xffffff);

uint SmallHashA(in uint seed) {
    return (seed ^ 1057926937u) * 3812423987u ^ ((seed*seed) * 4000000007u);
}
uint SmallHashB(in uint seed) {
    return (seed ^ 2156034509u) * 3699529241u;
}

// Reduced precision to 16 bits per component.
vec2 HashVec2(uint seed) {
    seed = SmallHashA(seed);
    seed = (seed << 13) | (seed >> 19);
    seed = SmallHashB(seed);
    return vec2(seed & 0xffffu, (seed >> 16) & 0xffffu) / float(0xffff);
}
// Reduced precision to ** 6 ** bits per component.
vec4 HashVec4(uint seed) {
    seed = SmallHashA(seed);
    seed = (seed << 13) | (seed >> 19);
    seed = SmallHashB(seed);
    return vec4((seed >> 8) & 0x3fu, (seed >> 14) & 0x3fu, (seed >> 20) & 0x3fu, (seed >> 26) & 0x3fu) / float(0x3fu);
}
vec4 HashVec4I2(ivec2 seed2) {
    return HashVec4(uint(seed2.x ^ (seed2.y * 65537)));
}

// ---- Procedural textures ----

vec3 mingrad(vec3 a, vec3 b) {
    if (a.x < b.x) return a;
    else return b;
}

vec3 dCircle(vec2 uv, float rad) {
    vec2 grad = normalize(uv);
    return vec3(length(uv) - rad, grad);
}

vec3 dBox(vec2 uv, vec2 rad) {
    vec2 grad = (abs(uv.x*rad.y) > abs(uv.y*rad.x)) ? vec2(1, 0) : vec2(0, 1);
    grad *= sign(uv);
    vec2 dist = abs(uv) - rad;
    float d = min(max(dist.x, dist.y), 0.0) + length(max(dist, 0.0));
    return vec3(d, grad);
}

vec4 texPanels(vec2 uv, out vec3 normal) {
    vec4 hash = HashVec4I2(ivec2(floor(uv+.0)));
    vec4 hash2 = HashVec4I2(ivec2(hash*8192.0));
    // vec4 hash3 = HashVec4I2(ivec2(hash2*8192.0)); // Unused optimization
    ivec2 fl = ivec2(floor(uv));
    vec2 centered = fract(uv) - 0.5;
    vec2 radOut = 0.35*hash2.xy + 0.1;
    radOut *= float((fl.x&1) ^ (fl.y&1)) *0.25+0.75; 
    if (hash.z > 0.99) radOut.x = radOut.y;
    float radThick = 1.0 / 32.0;

    vec2 jitterPos = centered + (hash.xy*2.0-1.0)*(0.5-radOut);
    vec3 dc;
    if (hash.z > 0.99) dc = dCircle(jitterPos, radOut.x - radThick);
    else dc = dBox(jitterPos, vec2(radOut - radThick));
    float d = saturate(dc.x/radThick);
    if ((d <= 0.0) || (d >= 1.0)) dc.yz = vec2(0.0);

    normal = normalize(vec3(dc.yz, 1.0));
    return vec4(vec3(1, 1, 1)-d*0.1, 0.1-d*0.05);
}

#define ANTIALIASING_SAMPLES 1
vec4 texSolarPanels(vec2 uv, out vec3 normal) {
    vec4 hash = HashVec4I2(ivec2(floor(uv+vec2(0.5,.25))));
    // ivec2 fl = ivec2(floor(uv));
    vec2 centered = fract(uv) - 0.5;
    float radThick = 1.0 / 64.0;
    vec3 dc = dBox(centered, vec2(0.02,0.55) - radThick);
    dc.x = saturate(dc.x/radThick);
    radThick *= 0.5;
    vec3 dc2 = dBox(centered - vec2(0, 0.25), vec2(0.55,0.0125) - radThick);
    dc2.x = saturate(dc2.x/radThick);
    vec3 dc3 = dBox(centered + vec2(0, 0.25), vec2(0.55,0.0125) - radThick);
    dc3.x = saturate(dc3.x/radThick);
    dc2 = mingrad(dc3, dc2);
    dc = mingrad(dc, dc2);
    float d = dc.x;
    if ((d <= 0.0) || (d >= 1.0)) dc.yz = vec2(0.0);

    normal = normalize(vec3(dc.yz + vec2(abs(sin((uv.x + 0.5)*PI)*0.1), 0.0), 1.0));
    float pad = (d < 1.0) ? 1.0 : 0.0;
    vec4 padCol = mix(vec4(1,1,1,0.25)*0.5, vec4(0.7, 0.5, 0.1, 0.5)*0.25, hash.x);

    return mix(vec4(.01, .015, .1, 0.8), padCol, pad);
}
// --- COMMON BLOCK END ---

// --- IMAGE BLOCK START ---

// OPTIMIZATION: Reduced Anti-Alias Size
#define ANTI_ALIAS_SIZE 0

// Space station rotation rate
#define ROT_SPEED -0.05
#define EARTH_ROT_SPEED 0.002
const float earthRad = 6371.0; // 6371 km
// Low earth orbit
const vec3 earthPos = normalize(vec3(-6500,-6400,-3400)) * (earthRad + 408.0);

// ---- noise functions ----
// Using texture noise where possible or simple hash
float Hash11(float a) { return fract(sin(a)*10403.9); }
float Hash21(vec2 uv) { float f = uv.x + uv.y * 37.0; return fract(sin(f)*104003.9); }
vec2 Hash22(vec2 uv) { float f = uv.x + uv.y * 37.0; return fract(cos(f)*vec2(10003.579, 37049.7)); }
float Hash2d(vec2 uv) { float f = uv.x + uv.y * 37.0; return fract(sin(f)*104003.9); }
float Hash3d(vec3 uv) { float f = uv.x + uv.y * 37.0 + uv.z * 521.0; return fract(sin(f)*110003.9); }

float mixP(float f0, float f1, float a) { return mix(f0, f1, a*a*(3.0-2.0*a)); }
const vec2 zeroOne = vec2(0.0, 1.0);

float noise(vec3 uv) {
    vec3 fr = fract(uv.xyz);
    vec3 fl = floor(uv.xyz);
    float h000 = Hash3d(fl);
    float h100 = Hash3d(fl + zeroOne.yxx);
    float h010 = Hash3d(fl + zeroOne.xyx);
    float h110 = Hash3d(fl + zeroOne.yyx);
    float h001 = Hash3d(fl + zeroOne.xxy);
    float h101 = Hash3d(fl + zeroOne.yxy);
    float h011 = Hash3d(fl + zeroOne.xyy);
    float h111 = Hash3d(fl + zeroOne.yyy);
    return mixP(
        mixP(mixP(h000, h100, fr.x), mixP(h010, h110, fr.x), fr.y),
        mixP(mixP(h001, h101, fr.x), mixP(h011, h111, fr.x), fr.y)
        , fr.z);
}

// Environment map sun
vec3 GetSunColorSmall(vec3 rayDir, vec3 sunDir, vec3 sunCol)
{
	vec3 localRay = normalize(rayDir);
	float dist = 1.0 - (dot(localRay, sunDir) * 0.5 + 0.5);
	float sunIntensity = 0.05 / dist;
	sunIntensity = min(sunIntensity, 40000.0);
	return sunCol * sunIntensity*0.01;
}

vec4 tex3d(vec3 pos, vec3 normal)
{
	// loook up texture, blended across xyz axis based on normal.
	vec4 texX = texture(iChannel2, pos.yz*4.0);
	vec4 texY = texture(iChannel2, pos.xz*4.0);
	vec4 texZ = texture(iChannel2, pos.xy*4.0);
	vec4 tex = mix(texX, texZ, abs(normal.z*normal.z));
	tex = mix(tex, texY, abs(normal.y*normal.y));
	return tex*tex;
}

struct RayHit {
    vec3 normMin, normMax;
    float tMin, tMax;
    vec3 hitMin, hitMax;
};
const float bignum = 256.0*256.0*256.0;

RayHit SphereIntersect2(vec3 pos, vec3 dirVec, vec3 spherePos, float rad)
{
    RayHit rh;
    rh.tMin = bignum; rh.tMax = bignum;
    rh.hitMin = vec3(0.0); rh.hitMax = vec3(0.0);
    rh.normMin = vec3(0.0); rh.normMax = vec3(0.0);
    
    vec3 delta = spherePos - pos;
    float projdist = dot(delta, dirVec);
    vec3 proj = dirVec * projdist;
    vec3 bv = proj - delta;
    float b = length(bv);
    if (b > rad) return rh;
    
    float x = sqrt(rad*rad - b*b);
    rh.tMin = projdist - x;
    if (rh.tMin < 0.0) { rh.tMin = bignum; return rh; }
    
    rh.tMax = projdist + x;
    rh.hitMin = pos + dirVec * rh.tMin;
    rh.hitMax = pos + dirVec * rh.tMax;
    rh.normMin = normalize(rh.hitMin - spherePos);
    rh.normMax = normalize(spherePos - rh.hitMax);
    return rh;
}

// Render Earth
vec3 GetEnvMapSpace(vec3 camPos, vec3 rayDir, vec3 sunDir, vec3 sunCol, float sunShadow)
{
    vec3 finalColor;
    vec3 atmosphereColor = vec3(70.0, 150.0, 240.0)/400.0;
    RayHit rh = SphereIntersect2(camPos, normalize(rayDir), earthPos, earthRad);
    RayHit rh2 = SphereIntersect2(camPos, normalize(rayDir), earthPos, earthRad + 77.0);
    if (rh.tMin < rh.tMax)
    {
        vec3 intersection = rh.hitMin;
        vec3 normal = rh.normMin;
        vec3 rotNormal = RotateX(normal, iTime*EARTH_ROT_SPEED+0.05);

        vec3 surface = vec3(0.01, 0.03, 0.081);
        vec3 landTex = texture(iChannel2, rotNormal.xy * 0.25 + vec2(0.0, sin(rotNormal.z*2.0)*.25)).xyz;
        vec3 land = landTex*vec3(0.19,0.22,0.16)*0.4;
        vec3 landDry = landTex.yzx*vec3(0.31,0.26,0.22)*0.33;
        land = mix(land, landDry, saturate(pow(landTex.y+.4,20.0)));
        float landMask = landTex.y*1.3;
        landMask += texture(iChannel2, rotNormal.yz * vec2(0.25,0.333)).y*1.3;
        landMask = saturate(pow(landMask-0.1, 60.0));
        surface=mix(surface,land,landMask);

        float clouds = tex3d(rotNormal * 0.5, rotNormal).y *
                   tex3d((-rotNormal.xyz + vec3(sin(rotNormal.y*15.0)*.02)) * 3.75, rotNormal).z * 4.5;
        surface += clouds;

        float d = dot(normal, normalize(camPos - intersection));
        float atmosphere = 1.0 - d;
        atmosphere = pow(atmosphere, 3.0);
        atmosphere = atmosphere * 0.9 + 0.1;
        surface = mix(surface, atmosphereColor, atmosphere);
        finalColor = surface;
    }
    else
    {
        finalColor = GetSunColorSmall(rayDir, sunDir, sunCol) * sunShadow;
    }
    if ((rh2.tMin < rh2.tMax)) {
        vec3 a = rh2.hitMin;
        vec3 b = rh2.hitMax;
        if (rh.tMin < rh.tMax) b = rh.hitMin;
        finalColor += pow(saturate(0.044 * atmosphereColor * exp(distance(a,b)*0.0018)), vec3(2.0));
    }
    return finalColor;
}

vec3 GetEnvMapSpaceGlossy(vec3 camPos, vec3 rayDir, vec3 sunDir, vec3 sunCol, float sunShadow)
{
    vec3 finalColor;
    vec3 atmosphereColor = vec3(70.0, 130.0, 240.0)/355.0;

    float dSun = max(0.0, dot(rayDir, sunDir));
    dSun = pow(dSun,7.0);
    float dEarth = dot(rayDir, normalize(earthPos)) * 0.5 + 0.5;
    dEarth = pow(dEarth,3.0)*0.6;
    
    finalColor = sunCol * dSun * sunShadow + atmosphereColor * dEarth;
    return finalColor;
}

// Helpers
void matmin(inout float distA, inout uint matA, float distB, uint matB) {
    if (distA > distB) { distA = distB; matA = matB; }
}
void matmax(inout float distA, inout uint matA, float distB, uint matB) {
    if (distA < distB) { distA = distB; matA = matB; }
}

float sdBox(vec3 p, vec3 radius) {
  vec3 dist = abs(p) - radius;
  return min(max(dist.x, max(dist.y, dist.z)), 0.0) + length(max(dist, 0.0));
}

float cylCap(vec3 p, float r, float lenRad) {
    float a = length(p.xy) - r;
    a = max(a, abs(p.z) - lenRad);
    return a;
}
float sdHexPrism( vec3 p, vec2 h ) {
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  p = abs(p);
  p.xy -= 2.0*min(dot(k.xy, p.xy), 0.0)*k.xy;
  vec2 d = vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x), h.x))*sign(p.y-h.x), p.z-h.y );
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

#define Repeat(a, len) (mod(a, len) - 0.5 * len)
vec3 RepeatX(vec3 a, float len) { return vec3(mod(a.x, len) - 0.5 * len, a.yz); }
vec2 RepeatX(vec2 a, float len) { return vec2(mod(a.x, len) - 0.5 * len, a.y); }
vec3 RepeatY(vec3 a, float len) { return vec3(a.x, mod(a.y, len) - 0.5 * len, a.z); }
vec2 RepeatY(vec2 a, float len) { return vec2(a.x, mod(a.y, len) - 0.5 * len); }
vec3 RepeatZ(vec3 a, float len) { return vec3(a.xy, mod(a.z, len) - 0.5 * len); }

vec3 FlipX(vec3 a, float rad) { return vec3(abs(a.x) - rad, a.yz); }
vec3 FlipY(vec3 a, float rad) { return vec3(a.x, abs(a.y) - rad, a.z); }
vec3 FlipZ(vec3 a, float rad) { return vec3(a.xy, abs(a.z) - rad); }
vec2 FlipX(vec2 a, float rad) { return vec2(abs(a.x) - rad, a.y); }
vec2 FlipY(vec2 a, float rad) { return vec2(a.x, abs(a.y) - rad); }
float Flip(float a, float rad) { return abs(a) - rad; }

vec3 cylTransform(vec3 p) {
    vec3 result = p;
    result.x = 26.0*(atan(p.z, p.x)/ PI);
    result.z = length(p.xz);
    return result;
}

float lengthM( vec3 p ) { return (abs(p.x) + abs(p.y) + abs(p.z)) * 0.5773; }
float length8( vec2 p ) { p=p*p; p=p*p; p=p*p; return pow(p.x+p.y,1.0/8.0); }
float sdTorusHard( vec3 p, vec2 t ) {
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length8(q)-t.y;
}

float sdRoundBox( vec3 p, vec3 b, float r ) {
  vec3 q = abs(p) - b;
  return lengthM(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

float Truss(vec3 p, float bigRad, float smallRad, float rungRad, float size) {
    float bound = sdBox(p, vec3(size, size, rungRad) + bigRad);
    if (bound > size*0.5) return bound;

    float d = length(FlipY(FlipX(p.xy, size), size)) - bigRad;
    vec3 rep4 = vec3( max(abs(p.xy), abs(p.yx)) - size, Repeat(p.z, size*2.0));
    float d2 = length(rep4.xz) - smallRad;
    d = min(d, d2);

    vec3 rot = RotateX(p, PI*0.25);
    rot = FlipX(rot, size);
    rot.z += 1.414*0.5*size;
    rot = RepeatZ(rot, 1.414*size);
    d2 = length(rot.xz) - smallRad;
    d2 = max(d2, Flip(p.y, size));
    d = min(d, d2);

    rot = RotateY(p, PI*0.25);
    rot = FlipY(rot, size);
    rot.z += 1.414*0.5*size;
    rot = RepeatZ(rot, 1.414*size);
    d2 = length(rot.yz) - smallRad;
    d2 = max(d2, Flip(p.x, size));
    d = min(d, d2);
    d = max(d, Flip(p.z, rungRad));
    return d;
}

// Materials
const uint matFloor = 1u;
const uint matWall = 2u;
const uint matPipe = 3u;
const uint matChrome = 4u;
const uint matGlossyRough = 5u;
const uint matSideWindows = 6u;
const uint matYellow = 7u;
const uint matBoring = 8u;
const uint matDome = 9u;
const uint matSolarPanel = 100u;
const uint matSpoke = 101u;
const uint matRGB = 202u;

uint SetMatRGB(uint r, uint g, uint b) { return matRGB | (r << 24) | (g << 16) | (b << 8); }
bool IsMatRGB(uint m) { return (m & 0xffu) == matRGB; }
vec3 GetMatRGB(uint m) { return vec3(float((m >> 24) & 0xffu), float((m >> 16) & 0xffu), float((m >> 8) & 0xffu)); }

const uint niceColors[4] = uint[](
    matRGB | (76u << 24) | (67u << 16) | (8u << 8),
    matRGB | (76u << 24) | (10u << 16) | (4u << 8),
    matRGB | (50u << 24) | (96u << 16) | (86u << 8),
    matRGB | (10u << 24) | (7u << 16) | (3u << 8)
);

void Dish(vec3 p, out float dist, out uint mat) {
    float d = sdTorusHard(FlipY(p, 0.03), vec2(0.1, 0.01));
    dist = d;
    mat = matGlossyRough;
    d = length(p + vec3(0.32,0,0)) - 0.22;
    d = max(d, -(length(p + vec3(0.43,0,0)) - 0.25));
    d = max(d, -p.x-0.25);
    float d2 = length(p.yz) - 0.15;
    d = max(d, d2)*0.7; 
    matmin(dist, mat, d, SetMatRGB(90u,90u,90u));

    vec3 pr = RotateZ(p + vec3(0.37, 0, 0), PI * 0.25);
    d = length(pr.xz) - 0.01;
    d = max(d, Flip(pr.y+0.107, 0.11));
    matmin(dist, mat, d, SetMatRGB(128u,128u,128u));
    d2 = cylCap(p.yzx + vec3(0,0,0.38), .035, .005);
    matmin(dist, mat, d2, matGlossyRough);
}

// OPTIMIZATION: Removed strict voxel padding for simplicity in background
float voxelPad = 0.005;

void CityBlock(vec3 p, ivec2 pint, out float dist, out uint mat)
{
    vec4 rand = HashVec4I2(pint);
    vec4 rand2 = HashVec4I2(ivec2(rand.zw*8192.0)+pint*127);
    vec4 randBig = HashVec4I2((ivec2(pint.x >> 1, pint.y >> 3)) + 1024);
    vec4 randBigger = HashVec4I2((pint >> 2) + 2048);

    float downtown = saturate(40.0 / length(vec2(pint.x,(    (pint.y+50)%100-50    )*8)));
    
    if (randBigger.w < 0.97) {
        if (randBig.w > 0.15) {
            float baseRad = 0.48 * max(0.1,1.0-rand.x);
            vec3 baseCenter = p - vec3(0.5 + (0.5-baseRad)*(rand.y*2.0-1.0)*0.7, 0.0, 0.5 + (0.5-baseRad)*(rand.z*2.0-1.0)*0.7);
            float height = rand.w*0.5 + 0.1; 
            height *= downtown*1.8;
            height = floor(height*20.0)*0.05;
            float d = sdBox(baseCenter, vec3(baseRad, height, baseRad)-0.02) - 0.02; 
            d = min(d, p.y);

            float height2 = rand.y * 0.3;
            height2 = floor(height2*20.0)*0.05;
            rand2 = floor(rand2*20.0)*0.05;
            
            // Simplified building logic
            d = min(d, sdBox(baseCenter - vec3(0.0, height, 0.0), vec3(baseRad, height2 - rand2.y, baseRad*0.4)-0.02)-0.02);
            d = min(d, sdBox(baseCenter - vec3(0.0, height, 0.0), vec3(baseRad*0.4, height2 - rand2.x, baseRad)-0.02)-0.02);
            
            if (rand2.y > 0.5) {
                d = min(d, sdBox(baseCenter - vec3(0.0, height, 0.0), vec3(baseRad*0.8*(rand2.y+.1), height2, baseRad*0.8*(rand2.z+.1))));
            } else {
                if (rand2.z > 0.5) d = min(d, sdHexPrism((baseCenter - vec3(0.0, height, 0.0)).xzy, vec2(baseRad*0.7, height2))-0.05);
            }

            dist = d, mat = matFloor;
            vec3 litf = rand2.xxx*.8+.2;
            litf += randBig.x*.25-.15;
            litf -= randBigger.x*.2-0.05;
            litf.z -= rand2.w*0.05-0.025;
            litf += vec3(0.0, 0.025, 0.04);
            litf= max(vec3(0.05), litf);
            uvec3 lit = uvec3(saturate(litf)*140.0);
            mat = SetMatRGB(lit.x,lit.y,lit.z);
            if (p.y < 0.01) mat = matFloor;
            
            // OPTIMIZATION: Reduced tiny details check
            if (rand2.w < 0.25) {
                float dtemp = sdRoundBox((baseCenter - vec3(0.0, height, 0.0)).xzy, vec3(baseRad,baseRad,baseRad)*rand.xyz*0.5, baseRad*0.45*rand.w );
                matmin(dist, mat, dtemp, matBoring);
            }

        } else {
            p.xz += vec2(pint.x&0x1,(pint.y&0x7)-3);
            dist = p.y, mat = matFloor;
            vec3 baseCenter = p - vec3(1.0, 0.0, 1.0);
            float d = length(baseCenter.xz) - 0.75 + sin(baseCenter.y*164.0)*0.002;
            d = max(d, abs(baseCenter.y)-0.25);
            float d2 = length(baseCenter +vec3(0.0, 0.6, 0.0)) - 0.995;
            d2 = max(d2, length(baseCenter.xz) - 0.75);
            d = sdBox(abs(baseCenter)-vec3(.5,0,0), vec3(0.3, 0.1, 3.3))-.1;
            matmax(dist, mat, -d, SetMatRGB(50u,51u,53u));
            d = sdBox((baseCenter)-vec3(.5,0,(randBig.z-.5)*4.), vec3(0.5*randBig.x, 0.74, 2.0*randBig.y));
            matmax(dist, mat, -d, niceColors[int(randBig.x*3.99)]);
            d = sdBox((baseCenter)-vec3(-.5,0,(randBig.w-.5)*4.), vec3(0.5*randBig.y, 0.74, 2.0*randBig.x));
            matmax(dist, mat, -d, niceColors[int(randBig.y*3.99)]);
        }
    } else {
        p.xz += vec2(pint.x&0x3, pint.y&0x3);
        dist = p.y, mat = matFloor;
        vec3 baseCenter = p - vec3(2.0, 0.5*randBigger.y, 2.0);
        float waveRoof = min(0.015, abs(   (sin(p.x*4.0)+sin(p.z*16.0))   *0.015));
        float d2 = sdRoundBox(baseCenter*vec3(1,1.-waveRoof,1) + vec3(0,0.75,0), vec3(1.1-randBigger.w*0.2), 0.65-randBigger.x*0.3);
        float d = sdRoundBox(RotateY(baseCenter,.785)*vec3(1,1.-waveRoof,1) + vec3(0,0.75,0), vec3(1.1-randBigger.w*0.2), 0.65-randBigger.x*0.3);
        d = min(d,d2);
        d*=1.25; 
        uint m =matDome;
        if (p.y < 0.2) m = SetMatRGB(60u,112u,120u);
        matmin(dist, mat, d, m);
    }
    
    vec3 rep = p - vec3(0.0, 0.1, 0.5);
    rep.x = Repeat(rep.x, 0.5);
    float d = length(rep.xy) - 0.0625 * rand2.x;
    if (rand.z > 0.7) matmin(dist, mat, d, matPipe);

    rep = p - vec3(0.0, 0.13 * rand.z, 0.5);
    rep.z = Repeat(rep.z, 0.5);
    d = length(rep.yz) - 0.025;
    if (randBigger.y > 0.6) {
        matmin(dist, mat, d, matWall);
        rep = p - vec3(0.0, 0.5 * rand2.z, 0.5);
        rep.x = Repeat(rep.x, 1.0);
        d = length(rep.xy) - 0.05;
        if (randBig.y > 0.5) {
            uint m = matPipe;
            if (randBig.x > 0.95) m =matYellow;
            matmin(dist, mat, d, m);
        }
    }
}

void DistanceToObject(vec3 p, out float dist, out uint mat)
{
    p = RotateY(p,ROT_SPEED*iTime);

    float density = 8.0;
    vec3 cyl = cylTransform(p);
    cyl.x *= density;

    dist = -100000000.0;
    mat = 0u;

    const float scale = 1.0;
    float scaleDen = scale / density;
    cyl = cyl.yzx/scaleDen;
    cyl.z *=scaleDen;
    cyl.y = cyl.y - 8.0*density;
    vec3 cylBasic = cyl;
    cyl.y = abs(cyl.y) - 1.0; 
    
    vec3 rep = cyl.xyz;
    rep.xz = fract(cyl.xz); 
    float dTemp;
    uint mTemp;
    CityBlock(rep, ivec2(floor(cyl.xz)), dTemp, mTemp);
    dTemp *= scaleDen;
    matmax(dist, mat, dTemp, mTemp);

    matmax(dist, mat, abs(p.y) - 1.0, matSideWindows);
    
    float ringRad = 0.05;
    float d = length(abs(cyl.xy) + vec2(-8.0, 0)) - ringRad;
    d *= scaleDen;
    matmin(dist, mat, d, matYellow);
    d = length(vec2(abs(cyl.x), cyl.y) + vec2(-8.0, 1)) - ringRad;
    d *= scaleDen;
    matmin(dist, mat, d, matSpoke);

    vec3 prot = FlipX(RotateX(cyl, PI*0.25), 0.0);
    float prep = Repeat(prot.y, 1.414);

    d = length(vec2(prot.x, prep) + vec2(-8.0, 0 )) - ringRad;
	prep = Repeat(prot.z, 1.414);
    float d2 = length(vec2(prot.x, prep) + vec2(-8.0, 0)) - ringRad;
    d = min(d, d2) * scaleDen;
    d = max(d, abs(length(p) - 8.0625) - 0.125);
    matmin(dist, mat, d, matSpoke);

    d = length(RepeatX(cylBasic.xy + vec2(-7.25, 59.2), 0.4)) - 0.05;
    d = max(d, abs(p.y) - 0.91);
    d *= scaleDen;
    matmin(dist, mat, d, matPipe);

    d  = sdBox(FlipZ(p + vec3(0,-.57,0.0), 0.58), vec3(0.25, 0.29, 0.03)) - 0.008;
    d2 = sdBox(FlipX(p + vec3(0,-.57,0.0), 0.58), vec3(0.03, 0.29, 0.25)) - 0.008;
    matmin(dist, mat, min(d, d2), matFloor);

    d = Truss(abs(p.xyz + vec3(0,-0.78,0)) - vec3(0.25,0.08,0.4), 0.005, 0.0025, 0.175, 0.025);
    matmin(dist, mat, d, matPipe);
    d = Truss(abs(p.zyx + vec3(0,-0.78,0)) - vec3(0.25,0.08,0.4), 0.005, 0.0025, 0.175, 0.025);
    matmin(dist, mat, d, matPipe);

    float ridge = clamp(abs(fract(p.z*4.0)-0.5), 0.05, 0.1)*0.125;
    float spoke = cylCap(abs(p.xyz) - vec3(0.25,0,0), 0.125, 8.0*scale) + ridge;
    matmin(dist, mat, spoke, ridge > .01249 ? matSpoke : matGlossyRough);
    ridge = clamp(abs(fract(p.x*4.0)-0.5), 0.05, 0.1)*0.125;
    spoke = cylCap(abs(p.zyx) - vec3(0.25,0,0), 0.125, 8.0*scale) + ridge;
    matmin(dist, mat, spoke, ridge > .01249 ? matSpoke : matGlossyRough);

    ridge = clamp(abs(fract(p.y*1.44+0.5)-0.5), 0.25, 0.3)*0.75;
    d = length(p.xz) - saturate(1.09-abs(p.y*0.2)) + ridge;
    d = max(d, abs(p.y) - 0.9);
    float dsub = length(p.xz) - 0.6;
    dsub = max(dsub, abs(abs(p.y-1.0) - 0.0) - 0.6);
    d = max(d, -dsub);
    matmin(dist, mat, d, matFloor);

    d  = sdBox(FlipZ(p + vec3(0,-.5,0.0), 0.59), vec3(0.25, 0.1, 0.05)) - 0.001;
    d2 = sdBox(FlipX(p + vec3(0,-.5,0.0), 0.59), vec3(0.05, 0.1, 0.25)) - 0.001;
    matmax(dist, mat, -min(d, d2), matPipe);

    const float len = 8.0 * scale;
    float wireThick = 0.001;
    prot = RotateY(p, PI*0.3333);
    float wire = length(prot - vec3(0,0,clamp(prot.z, -len, len))) - wireThick;
    float wire2 = length(prot - vec3(clamp(prot.x, -len, len),0,0)) - wireThick;

    prot = RotateY(p, PI*0.6666);
    wire = length(prot - vec3(0,0,clamp(prot.z, -len, len))) - wireThick;
    wire2 = length(prot - vec3(clamp(prot.x, -len, len),0,0)) - wireThick;

    // Ladder-struts in spokes
    prep = Repeat(p.x, 0.25);
    d = length(vec2(prep, abs(p.y) - 0.0))-0.015;
    d = max(d, length(p.xz)-len);
    d = max(d, abs(p.z) - 0.25);
    matmin(dist, mat, d, matSpoke);

    prep = Repeat(p.z, 0.25);
    d = length(vec2(prep, abs(p.y) - 0.0))-0.015;
    d = max(d, length(p.xz)-len);
    d = max(d, abs(p.x) - 0.25);
    matmin(dist, mat, d, matSpoke);

    // 45 degree struts
    prep = Repeat(prot.z+0.09, 0.25*0.707);
    d = length(vec2(prep, abs(prot.y) - 0.0))-0.015;
    d = max(d, length(p.xz)-len);
    d = max(d, abs(p.x) - 0.25);
    matmin(dist, mat, d, matSpoke);

    prep = Repeat(prot.x+0.09, 0.25*0.707);
    d = length(vec2(prep, abs(prot.y) - 0.0))-0.015;
    d = max(d, length(p.xz)-len);
    d = max(d, abs(p.z) - 0.25);
    matmin(dist, mat, d, matSpoke);

    p = RotateY(p,-ROT_SPEED*iTime);

    // Communications tower / truss
    d = Truss(p.xzy + vec3(0,0,4), 0.015, 0.0075, 3.535, 0.05);
    matmin(dist, mat, d, matGlossyRough);

    float tempD;
    uint tempM;
    Dish(RepeatY(RotateY(p, sin(floor(p.y/.666+.5)*1.73+iTime*0.1)) + vec3(0,4.9,0), 0.666), tempD, tempM);
    tempD = max(tempD, Flip(p.y+4.9, 2.666));
    matmin(dist, mat, tempD, tempM);
}

float SphereIntersect(vec3 pos, vec3 dirVec, vec3 spherePos, float rad)
{
    vec3 radialVec = pos - spherePos;
    float b = dot(radialVec, dirVec);
    float c = dot(radialVec, radialVec) - rad * rad;
    float h = b * b - c;
    if (h < 0.0) return -1.0;
    return -b - sqrt(h);
}

// OPTIMIZATION: Reduced Detail
vec4 texPanelsDense(vec2 uv, out vec3 normal) {
    vec3 texNormal = vec3(0);
    vec4 texColor = vec4(0);
    float mask = 0.0;
    // Reduced from 9 to 3 for performance
    for (int i = 0; i < 3; i++) {
        vec3 tempN;
        vec4 tempC = texPanels(uv/float(i+1)+37.5*float(1-i), tempN);
        texColor = mix(tempC, texColor, mask);
        texNormal = mix(tempN, texNormal, mask);
        mask = saturate((texColor.a-0.05)*200.0);
    }
    normal = texNormal;
    return texColor;
}

vec3 RayTrace(in vec2 fragCoord)
{
    const vec3 sunCol = vec3(2.58, 2.38, 2.10)*0.8;
	const vec3 sunDir = normalize(vec3(0.93, 1.0, 1.0));
    const vec3 skyCol = vec3(0.3,0.45,0.8)*0.5;
    const float exposure = 1.7;

	vec3 camPos, camUp, camLookat;
	vec2 uv = fragCoord.xy/iResolution.xy * 2.0 - 1.0;
    uv /= 3.0;

	camUp=vec3(0,1,0);
	camLookat=vec3(0,-1.75,0);

    float mx = -iMouse.x/iResolution.x*PI*2.0;
	float my = iMouse.y/iResolution.y*3.14 + PI/2.0;
	camPos = vec3(cos(my)*cos(mx),sin(my),cos(my)*sin(mx))*13.0;
    
    // Default cam if no mouse interaction
    if (iMouse.x <= 0.0 && iMouse.y <= 0.0) {
        camPos = vec3(10.0, 6.6, -8.0)*1.0;
        float remainder = fract(iTime * 0.095);
        camPos = vec3(10.0, 6.6, -8.)*(1.4 - remainder*.2);
        camLookat=vec3(0,-1.75,0);
        camUp=vec3(0,1,0.5);
    }

	vec3 camVec=normalize(camLookat - camPos);
	vec3 sideNorm=normalize(cross(camUp, camVec));
	vec3 upNorm=cross(camVec, sideNorm);
	vec3 worldFacing=(camPos + camVec);
	vec3 worldPix = worldFacing + uv.x * sideNorm * (iResolution.x/iResolution.y) + uv.y * upNorm;
	vec3 rayVec = normalize(worldPix - camPos);

    float dist;
    uint mat;
	float t = 0.05;
	const float maxDepth = 45.0; 
	vec3 pos = vec3(0.0);
    const float smallVal = 0.000625;
    
    float hit = SphereIntersect(camPos, rayVec, vec3(0.0), 8.5);
    if (hit >= 0.0)
    {
        t = hit;
        // OPTIMIZATION: Reduced from 250 to 100
        for (int i = 0; i < 100; i++)
        {
            pos = (camPos + rayVec * t);
            float walkA;
            {
                DistanceToObject(pos, dist, mat);
                walkA = dist;
            }
            dist = walkA;
            t += walkA;
            if ((t > maxDepth) || (abs(dist) < smallVal)) break;
        }
    }
    else
    {
        t = maxDepth + 1.0;
        dist = 1000000.0;
    }

    float alpha = -camPos.y / rayVec.y;
	vec3 finalColor = vec3(0.0);

    if ((t <= maxDepth) || (t == alpha))
	{
        vec3 smallVec = vec3(smallVal, 0, 0);
        vec3 normalU = vec3(0.0);
        for( int i=0; i<4; i++ )
        {
            vec3 e = 0.5773*(2.0*vec3((((i+3)>>1)&1),((i>>1)&1),(i&1))-1.0);
            float tempDist;
            uint tempMat;
            DistanceToObject(pos+0.0005*e, tempDist, tempMat);
            normalU += e*tempDist;
        }
        vec3 normal = normalize(normalU);

        float ff = 0.0125;
        float aa = 80.0;
        float ambient = 1.0;
        // OPTIMIZATION: Reduced AO samples from 6 to 3
        for( int i=0; i<3; i++ )
        {
            float tempDist;
            uint tempMat;
            DistanceToObject(pos + normal * ff, tempDist, tempMat);
            ambient *= saturate(tempDist*aa);
            ff *= 2.0;
            aa /= 2.0;
        }
        ambient = max(0.025, pow(ambient, 0.5));
        ambient = saturate(ambient);

        float sunShadow = 1.0;
        float iter = 0.01;
        vec3 nudgePos = pos + normal*0.002;
        // OPTIMIZATION: Reduced Shadow samples from 40 to 12
		for (int i = 0; i < 12; i++)
        {
            vec3 shadowPos = nudgePos + sunDir * iter;
            float tempDist;
            uint tempMat;
            DistanceToObject(shadowPos, tempDist, tempMat);
	        sunShadow *= saturate(tempDist*200.0);
            if (tempDist <= 0.0) break;
            iter += max(0.005, tempDist);
            if (iter > 4.5) break;
        }
        sunShadow = saturate(sunShadow);

        float specular = 0.0;
        vec3 texColor = vec3(0.5, 0.5, 0.5);
        vec3 pRot = RotateY(pos,ROT_SPEED*iTime);
        
        if (mat == matWall) texColor = vec3(0.5, 0.6, 0.7);
        else if (mat == matPipe) texColor = vec3(0.15, 0.12, 0.1)*0.5;
        else if (mat == matChrome) { texColor = vec3(0.01, 0.01, 0.01); specular = 1.0; }
        else if (mat == matGlossyRough) { texColor = vec3(0.5); specular = 0.99; }
        else if (mat == matYellow) { texColor = vec3(0.6, 0.42, 0.05)*.755; specular = 0.1; } 
        else if (mat == matSideWindows) {
            vec3 cyl = cylTransform(pRot);
            float grid = max(abs(fract(cyl.x*16.)*2.-1.), abs(fract(cyl.z*32.)*2.-1.));
            grid = saturate(grid*5.-4.5);
            texColor = vec3(0.5,0.7,1.0)*grid;
	        specular = .2;
        } else if (mat == matFloor) {
            vec3 cyl = cylTransform(pRot);
            vec3 spNorm;
            if (length(pRot) > 7.0) cyl.xy *= vec2(16.0,4.0);
            vec4 rgbspec = texPanelsDense(cyl.xy*8.0 * vec2(0.2, 1.2), spNorm);
            texColor = vec3(0.0,0.02,0.05);
            if (length(pRot) > 7.0) texColor += rgbspec.aaa*7.0-0.39;
            else texColor = max(vec3(0.33),texColor + rgbspec.aaa*4.0);
            texColor *= vec3(0.96, 0.98, .97);
	        specular = rgbspec.w * 0.1;
            if (abs(normal.y) > 0.9) texColor = vec3(0.4);
        } else if (mat == matDome) {
            vec3 cyl = cylTransform(pRot);
            texColor *= vec3(0.91, 0.97, 0.998)*.8;
            float windows = saturate(abs(fract(cyl.z*64.0)-0.5)*16.0-4.0);
            specular = windows*0.2;
            texColor *= windows*.35+.65;
        } else if (IsMatRGB(mat)) {
            texColor = GetMatRGB(mat)*(1.0/255.0);
        }

        float n = 0.0;
        float doubler = 1.0;
        for (int i = 0; i < 4; i++) {
            n += noise(pRot * 8.0 * doubler) / doubler;
            doubler *= 2.0;
        }
        texColor *= (n*0.25+0.75);

        if (mat == matSpoke) texColor = vec3(1.0)*0.6;

        if (mat == matSolarPanel) {
            vec3 spNorm;
            vec4 rgbspec = texSolarPanels(Rotate(pRot.xz*64.0, PI*0.25), spNorm);
            texColor = rgbspec.rgb;
	        specular = rgbspec.w;
        }
        
        vec3 lightColor = sunCol * saturate(dot(sunDir, normal)) * sunShadow;
        float ambientAvg = ambient;
        lightColor += (skyCol * saturate(dot(normal, normalize(earthPos)) *0.5+0.5))*pow(ambientAvg, 0.25);

        vec3 ref = reflect(rayVec, normalize(normal));
        vec3 env;
        if (mat == matGlossyRough) {
            env = GetEnvMapSpaceGlossy(pRot, ref, sunDir, sunCol, sunShadow);
        } else {
            env = GetEnvMapSpace(pRot, ref, sunDir, sunCol, sunShadow);
        }

        if (mat == matFloor) {
            float n2 = saturate((n-0.5)*1.);
            float windows = 1.0-saturate(abs(fract(pRot.y*16.)-.5)*14.-.9);
            if (texColor.x < 0.0001) {
                texColor = vec3(0.4);
                texColor *= windows;
                lightColor += vec3(.99,.8,.35)*2.*n2;
            }
        }

        finalColor = texColor * lightColor;
        finalColor = mix(finalColor, env, specular);
        finalColor = mix(finalColor, vec3(.07,.13,.2), .08);
	}
    else
    {
        finalColor = GetEnvMapSpace(camPos, rayVec, sunDir, sunCol, 1.0);
    }

    finalColor *= vec3(1.1) * saturate(1.1 - length(uv/1.2));
    finalColor *= exposure;
	return vec3(clamp(finalColor, 0.0, 1.0));
}

void main() {
    vec3 col = RayTrace(gl_FragCoord.xy);
    col = pow(col, vec3(0.4545)); // Gamma correction
    fragColor = vec4(col, 1.0);
}
