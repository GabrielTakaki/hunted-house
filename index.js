import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from "three/addons/objects/Sky.js";
import { FBXLoader, Timer } from "three/addons";

const timer = new Timer();

// vector for motion
const vector = { position: { x: 2.35, y: 0, z: 2}, rotation: { y: 0 } };

// key handler
// Evento de teclado
const keysPressed = {};
let isWalking = false;
document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    isWalking = true;
    if (walkingAction && idleAction && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        setAction(walkingAction);
    }
    e.preventDefault();
    if (e.key === "ArrowLeft") {
        vector.position.x -= 0.024;
        vector.rotation.y = -Math.PI / 2;
    }
    else if (e.key === "ArrowRight") {
        vector.position.x += 0.024;
        vector.rotation.y = Math.PI / 2;
    }
    else if (e.key === "ArrowUp") {
        vector.position.z -= 0.024;
        vector.rotation.y = Math.PI;
    }
    else if (e.key === "ArrowDown") {
        vector.position.z += 0.024;
        vector.rotation.y = 0;
    }
});

document.addEventListener('keyup', (e) => {
    e.preventDefault();
    isWalking = false;
    keysPressed[e.key] = false;
    updateZombiePosition();
    if (walkingAction && idleAction && !Object.values(keysPressed).includes(true)) {
        setAction(idleAction);
    }
});


const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const canvas = document.querySelector("canvas.webgl");

/* renderer */
const renderer = new THREE.WebGLRenderer({
    canvas
});
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio( Math.min(window.devicePixelRatio, 2) );


const scene = new THREE.Scene();

/* camera based on meters */
const camera = new THREE.PerspectiveCamera( 75, sizes.width / sizes.height, 0.1, 1000 );
camera.position.set( 4, 2, 5 );
scene.add(camera)

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
// Floor
const floorAlphaTexture = textureLoader.load('./assets/floor/alpha.png');
const floorColorTexture = textureLoader.load('./assets/floor/coast_sand_rocks_1k/diff_1k.webp');
const floorARMTexture = textureLoader.load('./assets/floor/coast_sand_rocks_1k/arm_1k.webp');
const floorNormalTexture = textureLoader.load('./assets/floor/coast_sand_rocks_1k/nor_gl_1k.webp');
const floorDisplacementTexture = textureLoader.load('./assets/floor/coast_sand_rocks_1k/disp_1k.webp');


// Only for color textures
floorColorTexture.colorSpace = THREE.SRGBColorSpace;

floorColorTexture.repeat.set(8, 8);
floorARMTexture.repeat.set(8, 8);
floorNormalTexture.repeat.set(8, 8);
floorDisplacementTexture.repeat.set(8, 8);

floorColorTexture.wrapS = THREE.RepeatWrapping;
floorColorTexture.wrapT = THREE.RepeatWrapping;
floorARMTexture.wrapS = THREE.RepeatWrapping;
floorARMTexture.wrapT = THREE.RepeatWrapping;
floorNormalTexture.wrapS = THREE.RepeatWrapping;
floorNormalTexture.wrapT = THREE.RepeatWrapping;
floorDisplacementTexture.wrapS = THREE.RepeatWrapping;
floorDisplacementTexture.wrapT = THREE.RepeatWrapping;


// Bush
const bushColorTexture = textureLoader.load('./assets/bush/leaves_forest_ground/diff_1k.webp');
const bushARMTexture = textureLoader.load('./assets/bush/leaves_forest_ground/arm_1k.webp');
const bushNormalTexture = textureLoader.load('./assets/bush/leaves_forest_ground/nor_gl_1k.webp');

// Only for color textures
bushColorTexture.colorSpace = THREE.SRGBColorSpace;

bushColorTexture.repeat.set(2, 1);
bushARMTexture.repeat.set(2, 1);
bushNormalTexture.repeat.set(2, 1);

// wrapT not needed because y is 1
bushColorTexture.wrapS = THREE.RepeatWrapping;
bushARMTexture.wrapS = THREE.RepeatWrapping;
bushNormalTexture.wrapS = THREE.RepeatWrapping;

// Grave
const graveColorTexture = textureLoader.load('./assets/grave/rock_wall/diff_1k.webp');
const graveARMTexture = textureLoader.load('./assets/grave/rock_wall/arm_1k.webp');
const graveNormalTexture = textureLoader.load('./assets/grave/rock_wall/nor_gl_1k.webp');

// Only for color textures
graveColorTexture.colorSpace = THREE.SRGBColorSpace;

graveColorTexture.repeat.set(0.3, 0.4);
graveARMTexture.repeat.set(0.3, 0.4);
graveNormalTexture.repeat.set(0.3, 0.4);

// wrapT not needed because y is 1
graveColorTexture.wrapS = THREE.RepeatWrapping;
graveARMTexture.wrapS = THREE.RepeatWrapping;
graveNormalTexture.wrapS = THREE.RepeatWrapping;

// Load textures
const diffuseTexture = textureLoader.load('./assets/house/cottage_textures/cottage_diffuse.webp');
const normalTexture = textureLoader.load('./assets/house/cottage_textures/cottage_normal.webp');
/**
 * 3D Models
 * */
const loader = new FBXLoader();
// Cottage
loader.load( "./assets/house/cottage_fbx.fbx",   (object) => {
    object.scale.set(0.002, 0.002, 0.002);
    object.position.set(0.5, 0, 0);

    diffuseTexture.colorSpace = THREE.SRGBColorSpace;

    // Create a material with the loaded textures
    const cottageMaterial = new THREE.MeshStandardMaterial({
        map: diffuseTexture,
        normalMap: normalTexture,
    });

    // Traverse the object to apply the material to all meshes
    object.traverse((child) => {
        if (child.isMesh) {
            child.material = cottageMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Add the object to the scene
    scene.add(object);
}, undefined, function (error) {
    console.error(error);
});


// Zombie Character
let zombieFbx;
let idleAction, walkingAction;
let actions = [];
let mixer;
let activeAction;

loader.load( "./assets/character/prisoner.fbx",   (fbx) => {
    zombieFbx = fbx;
    zombieFbx.scale.setScalar(0.007);
    zombieFbx.position.set(2.35, 0, 2);

    zombieFbx.traverse((c) => {
        c.castShadow = true;
    });

    mixer = new THREE.AnimationMixer(fbx);

    const idleLoader = new FBXLoader();
    idleLoader.load("./assets/character/animations/idle.fbx", (idle) => {
        const idleClip = idle.animations[0];
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
        actions.push(idleAction);

        const walkingLoader = new FBXLoader();
        walkingLoader.load("./assets/character/animations/walking.fbx", (walking) => {
            const walkingClip = walking.animations[0];
            walkingAction = mixer.clipAction(walkingClip);
            walkingAction.loop = THREE.LoopRepeat;
            actions.push(walkingAction);

            activeAction = idleAction;
        });
    });

    mixer.addEventListener('loop', (e) => {
        if (e.action === walkingAction) {
            zombieFbx.position.copy(vector.position)
        }
    })

    scene.add(zombieFbx);
}, undefined, function (error) {
    console.error(error);
});

// Função para transição de animações
const setAction = (toAction) => {
    if (toAction !== activeAction) {
        activeAction.fadeOut(0.5);
        toAction.reset().fadeIn(0.5).play();
        activeAction = toAction;
    }
};


/**
 House
*/
// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 100, 100),
    new THREE.MeshStandardMaterial({
        alphaMap: floorAlphaTexture,
        transparent: true,
        map: floorColorTexture,
        aoMap: floorARMTexture,
        roughnessmap: floorARMTexture,
        metalnessMap: floorARMTexture,
        normalMap: floorNormalTexture,
        displacementMap: floorDisplacementTexture,
        displacementScale: 0.3,
        displacementBias: -0.2,
    })
)
floor.rotation.x = Math.PI * -0.5;
scene.add(floor);

// Bushes
const bushGeometry = new THREE.SphereGeometry(1, 16, 16);
const bushMaterial = new THREE.MeshStandardMaterial({
    color: "#ccffcc",
    map: bushColorTexture,
    aoMap: bushARMTexture,
    roughnessmap: bushARMTexture,
    metalnessMap: bushARMTexture,
    normalMap: bushNormalTexture,
});

const bush1 = new THREE.Mesh(bushGeometry, bushMaterial);
bush1.scale.setScalar(0.5);
bush1.position.set(1.5, 0.2, 2);
bush1.rotation.x = -1;

const bush2 = new THREE.Mesh(bushGeometry, bushMaterial);
bush2.scale.setScalar(0.25);
bush2.position.set(1, 0.1, 2);
bush2.rotation.x = -1;

scene.add(bush1, bush2);

// Graves
const graveGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.2);
const graveMaterial = new THREE.MeshStandardMaterial({
    map: graveColorTexture,
    aoMap: graveARMTexture,
    roughnessmap: graveARMTexture,
    metalnessMap: graveARMTexture,
    normalMap: graveNormalTexture
});

const graves = new THREE.Group();
scene.add(graves);

for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 6;

    const grave = new THREE.Mesh(graveGeometry, graveMaterial);

    grave.position.set(Math.sin(angle) * radius, Math.random() * 0.4, Math.cos(angle) * radius)

    grave.rotation.x = (Math.random() - 0.5) * 0.4;
    grave.rotation.y = (Math.random() - 0.5) * 0.4;

    graves.add(grave);
}

/** Lights */
// ambient light
const ambientLight = new THREE.AmbientLight( "#86cdff", 0.275 );
scene.add( ambientLight );
// directional light
const directionalLight = new THREE.DirectionalLight( "#86cdff", 1);
directionalLight.position.set( 3, 2, -8 );
scene.add( directionalLight );
// door light
const doorLight = new THREE.PointLight( "#ff7d46", 5);
doorLight.position.set( 2.2, 2.2, 2.5);
scene.add(doorLight)

/**
 * Ghosts
 * */
const ghost1 = new THREE.PointLight("#8800ff", 6)
const ghost2 = new THREE.PointLight("#ff0088", 6)
scene.add(ghost1, ghost2)

/**
 * Shadows
 */
// Renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Cast and receive shadows
directionalLight.castShadow = true;
ghost1.castShadow = true;
ghost2.castShadow = true;

graves.children.forEach((grave) => {
    grave.receiveShadow = true;
    grave.castShadow = true;
})

// Mapping
directionalLight.shadow.mapSize.width = 256;
directionalLight.shadow.mapSize.height = 256;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.bottom = -8;
directionalLight.shadow.camera.left = -8;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 20;

ghost1.shadow.mapSize.width = 256;
ghost1.shadow.mapSize.height = 256;
ghost1.shadow.camera.far = 10;

ghost2.shadow.mapSize.width = 256;
ghost2.shadow.mapSize.height = 256;
ghost2.shadow.camera.far = 10;

/**
 * Sky
 * */
const sky = new Sky();
const skyUniforms = sky.material.uniforms;
skyUniforms["turbidity"].value = 10;
skyUniforms["rayleigh"].value = 3;
skyUniforms["mieCoefficient"].value = 0.1;
skyUniforms["mieDirectionalG"].value = 0.95;
skyUniforms["sunPosition"].value.set(0.3, -0.038, -0.95);
sky.scale.set(100, 100, 100)

scene.add(sky);

/**
 * Fog
 */
scene.fog = new THREE.FogExp2("#02343f", 0.1);

/** Orbit controls */
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;



function tick() {
    timer.update();

    const delta = timer.getDelta();

    if (mixer) {
        mixer.update(delta);

        if (zombieFbx && walkingAction) {
            zombieFbx.rotation.y = vector.rotation.y;
        }
    }


    const elapsedTime = timer.getElapsed()

    /** Ghost animation */
    const ghost1Speed = 0.5;
    const ghost2Speed = 0.38;

    const ghost1Angle = elapsedTime * ghost1Speed;
    ghost1.position.x = Math.cos(ghost1Angle) * 6;
    ghost1.position.z = Math.sin(ghost1Angle) * 6;
    ghost1.position.y = Math.sin(ghost1Angle) * Math.sin(ghost1Angle* 2.5) * Math.sin(ghost1Angle * 3.34)

    const ghost2Angle = elapsedTime * ghost2Speed;
    ghost2.position.x = -Math.cos(ghost2Angle) * 7;
    ghost2.position.z = -Math.sin(ghost2Angle) * 7;
    ghost2.position.y = Math.sin(ghost2Angle) * Math.sin(ghost2Angle* 2.5) * Math.sin(ghost2Angle * 3.34)


    controls.update()

    renderer.render( scene, camera)

    window.requestAnimationFrame(tick)
}

tick();

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

function updateZombiePosition() {
    if (zombieFbx) {
        console.log(vector.position)
        zombieFbx.position.copy(vector.position);
    }
}
