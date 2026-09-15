import * as THREE from 'three'

/**
 * The environment the model is lit BY, as opposed to the lights in the scene.
 *
 * WHY THIS FILE EXISTS. Three's lights give a surface its diffuse shading and
 * its shadow. They do not give it the thing that actually reads as "real": the
 * dim reflection of a bright sky in a floor, the sheen along the top edge of a
 * desk, the way a matte wall is slightly cooler where it faces up and warmer
 * where it faces the ground. That is image-based lighting, and without it a
 * `MeshStandardMaterial` scene looks like flat plastic no matter how many
 * lights are added — adding more lights makes it worse, not better, because
 * every extra light is another hard falloff on a surface that should be
 * picking up a soft gradient.
 *
 * WHY IT IS PROCEDURAL AND NOT AN HDRI FILE. An `.hdr` is a megabyte or two of
 * binary that would have to be committed, served, version-controlled and
 * licence-audited, and it would be fetched over the network before the model
 * could be shown. This builds the same thing in about a millisecond from three
 * colours, ships as source, and can never 404. The trade is that it cannot
 * reproduce a specific real location — which an architectural presentation of a
 * plan with no site information should not be pretending to do anyway.
 *
 * THE GROUND HALF IS NOT DECORATION. A dome that is sky all the way round lights
 * the underside of every desk and shelf as brightly as the top, which erases the
 * shading that tells the eye an object is sitting on a floor. The lower half is
 * darker and warmer for that reason, and it is what makes furniture look placed
 * rather than floating.
 */

// THESE ARE LIGHTING COLOURS, NOT THE BACKDROP. The backdrop stays the
// saturated sky blue of `BACKGROUND_COLOR`; the dome that LIGHTS the model is
// deliberately close to neutral. The first version of this file used the
// backdrop blue for both, on the reasoning that a model should reflect what is
// behind it, and the result was a building whose grey walls read as pink and
// whose timber desks read as purple - a dome is hemispherical, so a saturated
// one tints every surface at once and there is nothing left to judge the tint
// against. Measured against the Blender render of the same document, that
// version sat 47 degrees of hue and 20% of saturation away from it.
//
// Real daylight works the same way: the sky is blue, but sunlight is white and
// carries most of the energy, so a white wall outdoors still looks white.
const SKY = 0xc8e0f8
const HORIZON = 0xafd2ea
// The one colour that stays clearly tinted. It is a warm bounce off the ground,
// it only reaches upward-facing surfaces and the undersides of things, and it
// is what stops the whole model going cold.
const GROUND = 0x6b6b6a

const SKY_INTENSITY = 1.25
const GROUND_INTENSITY = 0.45

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// The colours arrive as LINEAR values - `new THREE.Color(hex)` converts from
// sRGB on the way in - and the PMREM target is linear, so no transfer function
// is applied here. Doing the conversion twice is what produces a washed-out
// grey-blue environment that lights everything as if it were overcast.
const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 skyColor;
  uniform vec3 horizonColor;
  uniform vec3 groundColor;
  uniform float skyIntensity;
  uniform float groundIntensity;
  varying vec3 vDirection;

  void main() {
    float height = normalize(vDirection).y;
    vec3 color;
    if (height > 0.0) {
      // pow() < 1 keeps the bright band near the horizon wide, which is what
      // puts a highlight along the top edge of horizontal surfaces.
      color = mix(horizonColor, skyColor, pow(height, 0.55)) * skyIntensity;
    } else {
      color = mix(horizonColor, groundColor, pow(-height, 0.4)) * groundIntensity;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`

/** One bright quad, which is what puts a specular highlight on a glossy floor. */
function lightCard(size, position, intensity) {
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xffffff).multiplyScalar(intensity),
    side: THREE.DoubleSide,
  })
  const card = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material)
  card.position.copy(position)
  card.lookAt(0, 0, 0)
  return card
}

/**
 * Build the environment texture. Returns a `THREE.Texture` the caller owns and
 * must `dispose()`.
 *
 * `fromScene`'s second argument is the blur applied while pre-filtering. A small
 * non-zero value softens the seam between the light cards and the dome; zero
 * leaves four visible rectangles reflected in every glossy surface.
 */
export function buildEnvironment(renderer) {
  const generator = new THREE.PMREMGenerator(renderer)
  generator.compileEquirectangularShader()

  const scene = new THREE.Scene()

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 24),
    new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        skyColor: { value: new THREE.Color(SKY) },
        horizonColor: { value: new THREE.Color(HORIZON) },
        groundColor: { value: new THREE.Color(GROUND) },
        skyIntensity: { value: SKY_INTENSITY },
        groundIntensity: { value: GROUND_INTENSITY },
      },
      // BackSide: the camera is inside the sphere, so the outward-facing
      // triangles are the ones that get culled.
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  scene.add(dome)

  // One strong key in the sun's direction and two weak wraps, which is the
  // three-point setup a product photographer would use. Without the key, a
  // polished floor has nothing to reflect and reads as matte paper.
  scene.add(lightCard(28, new THREE.Vector3(18, 34, 22), 6.0))
  scene.add(lightCard(22, new THREE.Vector3(-30, 16, -12), 1.4))
  scene.add(lightCard(22, new THREE.Vector3(6, 12, -34), 1.1))

  const target = generator.fromScene(scene, 0.06)

  dome.geometry.dispose()
  dome.material.dispose()
  for (const child of scene.children) {
    if (child === dome) continue
    child.geometry?.dispose()
    child.material?.dispose()
  }
  generator.dispose()

  return target.texture
}
