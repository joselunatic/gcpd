// Theme Mode: true = Dark (white on black), false = Light (black on white)
let isDarkMode = true

//Create a clock for rotation
const clock = new THREE.Clock()

// Set rotate boolean variable
let rotateModel = false
let rotateLight = false

// Detect mobile device and enable light rotation by default
const isMobileDevice = /(Mobi|Android|iPhone|iPad|iPod|Mobile)/i.test(navigator.userAgent) || window.innerWidth <= 768;
if (isMobileDevice) {
    rotateLight = true;
}

// Update the Rotate Light button to reflect current state
function updateRotateLightButtonUI() {
    const btn = document.getElementById('rotateLightButton');
    if (!btn) return;
    // Remove existing color classes
    btn.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-yellow-600', 'hover:bg-yellow-700', 'bg-gray-600', 'hover:bg-gray-700');

    if (rotateLight) {
        btn.textContent = 'Pause Light';
        btn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
    } else {
        btn.textContent = 'Rotate Light';
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
}

// Initialize button state on load
updateRotateLightButtonUI();

// Update the Rotate Model button to reflect current state
function updateRotateModelButtonUI() {
    const btn = document.getElementById('rotateButton');
    if (!btn) return;
    // Remove existing color classes
    btn.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-yellow-600', 'hover:bg-yellow-700', 'bg-gray-600', 'hover:bg-gray-700');

    if (rotateModel) {
        btn.textContent = 'Pause Rotate';
        btn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
    } else {
        btn.textContent = 'Rotate Model';
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
}

updateRotateModelButtonUI();


//Ugh, don't ask about this stuff
var userUploaded = false
let controls

// Creates empty mesh container
const myMesh = new THREE.Mesh();

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0, 0, 0);

//Lights
const pointLight1 = new THREE.PointLight(0xffffff, 1, 0, 0);
pointLight1.position.set(100, 100, 400);
scene.add(pointLight1);

// const pointLight2 = new THREE.PointLight(0xffffff, .1);
// pointLight2.position.set(0, -50, 0); // Fill light on opposite side
// scene.add(pointLight2);

// Parameters
const stlLoader = new THREE.STLLoader()

//Material
const material = new THREE.MeshStandardMaterial()
material.flatShading = true
material.side = THREE.DoubleSide;

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 2000)

// Renderer
const renderer = new THREE.WebGLRenderer()

let effect;

let characters = ' .:-+*=%@#'
const effectSize = { amount: .205 }
let backgroundColor = 'black'
let ASCIIColor = 'white'
const asciiContainer = document.getElementById('ascii-container') || document.body;
const profiles = {
    default: {
        name: 'Default',
        characters: ' .:-+*=%@#',
        effectResolution: .205,
        mode: 'ascii',
        flatShading: true,
        roughness: .35,
        metalness: .1,
        cutoffThreshold: .08
    },
    normal: {
        name: 'Normal',
        characters: ' .:-+*=%@#',
        effectResolution: .205,
        mode: 'render',
        flatShading: true,
        roughness: .35,
        metalness: .1,
        cutoffThreshold: .08
    },
    wayne90x30: {
        name: 'Wayne 90x30',
        characters: ' .:-+*=%@#',
        effectResolution: .2,
        mode: 'ascii',
        flatShading: false,
        roughness: .95,
        metalness: 0,
        cutoffThreshold: .12
    }
};
let currentProfile = 'default';
let outputMode = 'ascii';
let currentOutputElement = null;
const profileState = {};

// Profile/grid helpers
const GRID_TARGET = { cols: 90, rows: 30 };
const profileSelect = document.getElementById('profileSelect');
const scanlineToggle = document.getElementById('scanlineToggle');
const gridReadout = document.getElementById('gridReadout');
const cleanCutoffToggle = document.getElementById('cleanCutoffToggle');
const cleanCutoffSlider = document.getElementById('cleanCutoffSlider');
const cleanCutoffReadout = document.getElementById('cleanCutoffReadout');

let baseCharacters = profiles.default.characters;
let cleanBackgroundEnabled = true;
let cleanBackgroundThreshold = profiles.default.cutoffThreshold || 0.08;

function buildCharacterSet(source) {
    const threshold = cleanBackgroundEnabled ? cleanBackgroundThreshold : 0;
    const pool = Math.max(source.length, 12);
    const extraSpaces = Math.round(threshold * pool);
    const spaceChunk = ' '.repeat(Math.max(0, extraSpaces));
    return `${spaceChunk}${source}`;
}

function refreshCleanReadout() {
    if (!cleanCutoffReadout) return;
    if (cleanBackgroundEnabled) {
        cleanCutoffReadout.textContent = `Cutoff: ${cleanBackgroundThreshold.toFixed(3)}`;
    } else {
        cleanCutoffReadout.textContent = 'Cutoff: off';
    }
}

function refreshEffectCharacters() {
    if (outputMode !== 'ascii') return;
    if (effect?.domElement?.parentNode) {
        effect.domElement.parentNode.removeChild(effect.domElement);
    }
    createEffect();
    attachOutput();
    createOrbitControls();
}

function setBaseCharacters(value, skipRefresh = false) {
    baseCharacters = value || profiles.default.characters;
    if (!skipRefresh && outputMode === 'ascii') {
        refreshEffectCharacters();
    }
}

function createEffect() {
    characters = buildCharacterSet(baseCharacters);
    effect = new THREE.AsciiEffect(renderer, characters, { invert: true, resolution: effectSize.amount });
    effect.setSize(sizes.width, sizes.height);
    effect.domElement.style.color = ASCIIColor;
    effect.domElement.style.backgroundColor = backgroundColor;
    effect.domElement.style.fontFamily = 'monospace';
    effect.domElement.style.letterSpacing = '0px';
}

function getOutputElement() {
    if (outputMode === 'ascii' && effect?.domElement) return effect.domElement;
    return renderer.domElement;
}

function attachOutput() {
    const el = getOutputElement();
    if (!el) return;
    if (currentOutputElement?.parentNode) {
        currentOutputElement.parentNode.removeChild(currentOutputElement);
    }
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.display = 'block';
    asciiContainer.appendChild(el);
    currentOutputElement = el;
}

function ensureScanlineStyle() {
    if (document.getElementById('ascii-scanline-style')) return;
    const style = document.createElement('style');
    style.id = 'ascii-scanline-style';
    style.textContent = `
      #ascii-container.ascii-scanlines::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(
          to bottom,
          rgba(0,0,0,0.18) 0px,
          rgba(0,0,0,0.18) 1px,
          rgba(0,0,0,0) 2px,
          rgba(0,0,0,0) 4px
        );
        mix-blend-mode: multiply;
      }
      #ascii-container { position: absolute; inset: 0; }
    `;
    document.head.appendChild(style);
}

// Create and configure orbit controls
function createOrbitControls() {
    const targetEl = getOutputElement();
    if (!targetEl) return;
    controls = new THREE.OrbitControls(camera, targetEl)

    // Configure orbit controls for smoother interaction
    controls.enableDamping = true; // Add smooth damping
    controls.dampingFactor = 0.05; // Lower = smoother
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.5; // Slower rotation for smoother feel
    controls.zoomSpeed = 0.8; // Slightly slower zoom
    controls.panSpeed = 0.8; // Slightly slower pan

    // Configure mouse button controls
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE
    }
}

createEffect()
attachOutput()

// --- Profiles: definition + save/restore + 90x30 grid logic ---
function captureProfileState(profileKey) {
    return {
        characters,
        effectResolution: effectSize.amount,
        backgroundColor,
        ASCIIColor,
        rotateModel,
        rotateLight,
        lightAngle: document.getElementById('lightSlider')?.value,
        lightHeight: document.getElementById('lightHeightSlider')?.value,
        rotateX: document.getElementById('rotateXSlider')?.value,
        rotateY: document.getElementById('rotateYSlider')?.value,
        rotateZ: document.getElementById('rotateZSlider')?.value,
        scale: document.getElementById('scaleSlider')?.value,
        fontSize: effect?.domElement?.style?.fontSize || '',
        lineHeight: effect?.domElement?.style?.lineHeight || '',
        scanlines: asciiContainer.classList.contains('ascii-scanlines'),
        baseCharacters,
        cleanBackgroundEnabled,
        cleanBackgroundThreshold
    };
}

function applyProfileState(state) {
    if (!state) return;
    characters = state.characters;
    effectSize.amount = state.effectResolution;
    backgroundColor = state.backgroundColor;
    ASCIIColor = state.ASCIIColor;
    rotateModel = state.rotateModel;
    rotateLight = state.rotateLight;
    if (effect?.domElement) {
        effect.domElement.style.fontSize = state.fontSize || '';
        effect.domElement.style.lineHeight = state.lineHeight || '';
        effect.domElement.style.color = ASCIIColor;
        effect.domElement.style.backgroundColor = backgroundColor;
    }
    if (state.lightAngle != null) document.getElementById('lightSlider').value = state.lightAngle;
    if (state.lightHeight != null) document.getElementById('lightHeightSlider').value = state.lightHeight;
    if (state.rotateX != null) document.getElementById('rotateXSlider').value = state.rotateX;
    if (state.rotateY != null) document.getElementById('rotateYSlider').value = state.rotateY;
    if (state.rotateZ != null) document.getElementById('rotateZSlider').value = state.rotateZ;
    if (state.scale != null) document.getElementById('scaleSlider').value = state.scale;
    if (state.scanlines) asciiContainer.classList.add('ascii-scanlines');
    else asciiContainer.classList.remove('ascii-scanlines');
    if (scanlineToggle) scanlineToggle.checked = Boolean(state.scanlines);
    updateRotateModelButtonUI();
    updateRotateLightButtonUI();
    baseCharacters = state.baseCharacters || baseCharacters;
    cleanBackgroundEnabled = state.cleanBackgroundEnabled ?? cleanBackgroundEnabled;
    cleanBackgroundThreshold = state.cleanBackgroundThreshold ?? cleanBackgroundThreshold;
    if (cleanCutoffToggle) cleanCutoffToggle.checked = cleanBackgroundEnabled;
    if (cleanCutoffSlider) cleanCutoffSlider.value = cleanBackgroundThreshold;
    refreshCleanReadout();
    refreshEffectCharacters();
}

function measureChar() {
    if (outputMode !== 'ascii' || !effect?.domElement) return { w: 8, h: 16 };
    const span = document.createElement('span');
    span.textContent = 'M';
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.fontFamily = effect.domElement.style.fontFamily || 'monospace';
    span.style.fontSize = effect.domElement.style.fontSize || '16px';
    span.style.lineHeight = effect.domElement.style.lineHeight || '1';
    effect.domElement.appendChild(span);
    const rect = span.getBoundingClientRect();
    span.remove();
    return { w: rect.width || 8, h: rect.height || 16 };
}

function updateGridReadout(cols, rows, cellW, cellH) {
    if (!gridReadout) return;
    gridReadout.textContent = `Grid: ${cols} x ${rows} | Cell: ${cellW.toFixed(1)}x${cellH.toFixed(1)}px`;
}

function applyWayneGrid() {
    if (outputMode !== 'ascii' || !effect?.domElement) return;
    const width = asciiContainer.clientWidth || window.innerWidth;
    const height = asciiContainer.clientHeight || window.innerHeight;
    let fontSize = height / GRID_TARGET.rows;
    effect.domElement.style.fontSize = `${fontSize}px`;
    effect.domElement.style.lineHeight = '1';
    let metrics = measureChar();
    if (metrics.w > 0) {
        fontSize = fontSize * (width / (GRID_TARGET.cols * metrics.w));
        effect.domElement.style.fontSize = `${fontSize}px`;
    }
    metrics = measureChar();
    const lineHeight = (height / GRID_TARGET.rows) / (metrics.h || 1);
    effect.domElement.style.lineHeight = `${lineHeight}`;
    const cols = Math.floor(width / (metrics.w || 1));
    const rows = Math.floor(height / (metrics.h || 1));
    updateGridReadout(cols, rows, metrics.w, metrics.h);
}

function applyProfile(profileKey) {
    profileState[currentProfile] = captureProfileState(currentProfile);
    currentProfile = profileKey;

    const profile = profiles[profileKey] || profiles.default;
    characters = profile.characters;
    effectSize.amount = profile.effectResolution;
    outputMode = profile.mode || 'ascii';
    baseCharacters = profile.characters;
    cleanBackgroundEnabled = true;
    cleanBackgroundThreshold = profile.cutoffThreshold ?? cleanBackgroundThreshold;
    if (cleanCutoffToggle) cleanCutoffToggle.checked = cleanBackgroundEnabled;
    if (cleanCutoffSlider) cleanCutoffSlider.value = cleanBackgroundThreshold;
    refreshCleanReadout();

    if (outputMode === 'ascii') {
        createEffect();
        attachOutput();
    } else {
        attachOutput();
    }
    createOrbitControls();
    onWindowResize();

    if (profileKey === 'wayne90x30') {
        // Smooth shading + neutral material
        material.flatShading = false;
        material.roughness = profile.roughness;
        material.metalness = profile.metalness;
        material.needsUpdate = true;
        // Color management + tone mapping
        if ('outputColorSpace' in renderer) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else if ('outputEncoding' in renderer) {
            renderer.outputEncoding = THREE.sRGBEncoding;
        }
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        // Force charset and disable custom text controls
        document.getElementById('newASCII').setAttribute('disabled', true);
        document.getElementById('updateASCII').setAttribute('disabled', true);
        document.getElementById('resetASCII').setAttribute('disabled', true);
        ensureScanlineStyle();
        if (scanlineToggle) scanlineToggle.disabled = false;
        if (scanlineToggle) scanlineToggle.checked = false;
        applyWayneGrid();
    } else {
        material.flatShading = true;
        material.needsUpdate = true;
        document.getElementById('newASCII').removeAttribute('disabled');
        document.getElementById('updateASCII').removeAttribute('disabled');
        document.getElementById('resetASCII').removeAttribute('disabled');
        asciiContainer.classList.remove('ascii-scanlines');
        if (scanlineToggle) scanlineToggle.disabled = true;
        if (gridReadout) gridReadout.textContent = 'Grid: -- x --';
    }

    if (outputMode === 'render') {
        document.getElementById('newASCII').setAttribute('disabled', true);
        document.getElementById('updateASCII').setAttribute('disabled', true);
        document.getElementById('resetASCII').setAttribute('disabled', true);
        document.getElementById('copyASCII').setAttribute('disabled', true);
        document.getElementById('clipboardASCII').setAttribute('disabled', true);
        asciiContainer.classList.remove('ascii-scanlines');
        if (scanlineToggle) scanlineToggle.disabled = true;
        if (gridReadout) gridReadout.textContent = 'Grid: -- x --';
    } else {
        document.getElementById('copyASCII').removeAttribute('disabled');
        document.getElementById('clipboardASCII').removeAttribute('disabled');
    }

    const saved = profileState[profileKey];
    if (saved) applyProfileState(saved);
}


stlLoader.load(
    './models/model.stl',
    function (geometry) {

        myMesh.material = material;
        myMesh.geometry = geometry;

        var tempGeometry = new THREE.Mesh(geometry, material)
        myMesh.position.copy = (tempGeometry.position)

        geometry.computeVertexNormals();
        myMesh.geometry.center()

        myMesh.geometry.computeBoundingBox();

        resetPositions();

        var bbox = myMesh.geometry.boundingBox;

        myMesh.position.y = ((bbox.max.z - bbox.min.z) / 5)

        camera.position.x = ((bbox.max.x * 4));
        camera.position.y = ((bbox.max.y));
        camera.position.z = ((bbox.max.z * 3));

        scene.add(myMesh);

        createOrbitControls()


        function tick() {
            if (rotateModel) {
                myMesh.rotation.z += 0.01; // Adjust speed as needed
            }

            if (rotateLight) {
                const lightSlider = document.getElementById('lightSlider');
                let currentAngle = parseFloat(lightSlider.value);
                currentAngle = (currentAngle + 1) % 360;
                lightSlider.value = currentAngle;
                // Manually trigger the input event to update the light's position
                lightSlider.dispatchEvent(new Event('input'));
            }

            // Update controls for smooth damping
            controls.update();

            render()
            window.requestAnimationFrame(tick)
        }

        function render() {
            if (outputMode === 'ascii' && effect) {
                effect.render(scene, camera);
            } else {
                renderer.render(scene, camera);
            }
        }

        tick()

        document.getElementById('file-selector').addEventListener('change', openFile, false);


        function openFile(evt) {
            const fileObject = evt.target.files[0];

            const reader = new FileReader();
            reader.readAsArrayBuffer(fileObject);
            reader.onload = function () {
                if (userUploaded == false) {
                    userUploaded = true;
                }
                const geometry = stlLoader.parse(this.result);
                tempGeometry = geometry;
                myMesh.geometry = geometry;
                myMesh.geometry.center()
                myMesh.geometry.computeBoundingBox();
                resetPositions();

                var bbox = myMesh.geometry.boundingBox;

                // camera.position.x = ((bbox.max.x * 4));
                // camera.position.y = ((bbox.max.y));
                // camera.position.z = ((bbox.max.z * 3));

                myMesh.position.y = ((bbox.max.z - bbox.min.z) / 6)

                scene.add(myMesh);
            };
        };
    }
)


document.getElementById('screenshotButton').addEventListener('click', takeScreenshot);

function takeScreenshot() {
    // Capture only the ASCII canvas, not the entire page
    html2canvas(effect.domElement).then(function (canvas) {
        var link = document.createElement("a");
        document.body.appendChild(link);
        link.download = "ASCII.jpg";
        link.href = canvas.toDataURL("image/jpg");
        console.log(link.href);
        // link.target = '_blank';
        link.click();
    });
}

document.getElementById('updateASCII').addEventListener('click', updateASCII);

function updateASCII() {
    if (outputMode !== 'ascii') return;

    if (effect?.domElement?.parentNode) effect.domElement.parentNode.removeChild(effect.domElement)

    setBaseCharacters(" " + "." + document.getElementById('newASCII').value, true);

    createEffect()
    onWindowResize()

    attachOutput()

    createOrbitControls()

}

document.getElementById('resetASCII').addEventListener('click', resetASCII);

function resetASCII() {
    if (outputMode !== 'ascii') return;

    if (effect?.domElement?.parentNode) effect.domElement.parentNode.removeChild(effect.domElement)

    setBaseCharacters(' .:-+*=%@#', true);

    createEffect()
    onWindowResize()

    attachOutput()

    createOrbitControls()
}

document.getElementById('lightDark').addEventListener('click', lightDark);

function lightDark() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);

    if (isDarkMode) {
        backgroundColor = 'black';
        ASCIIColor = 'white';
    } else {
        backgroundColor = 'white';
        ASCIIColor = 'black';
    }

    effect.domElement.style.color = ASCIIColor;
    effect.domElement.style.backgroundColor = backgroundColor;
}

document.getElementById('lightSlider').addEventListener('input', function (e) {
    const angleDeg = parseFloat(e.target.value);
    const angleRad = angleDeg * Math.PI / 180;
    const radius = myMesh.geometry.boundingBox.max.z * 2; // Distance from origin, similar to initial position

    // Get height from the height slider
    const heightSlider = document.getElementById('lightHeightSlider');
    const heightMultiplier = parseFloat(heightSlider.value);

    // Calculate height based on bounding box
    let height = 85; // Default height
    if (myMesh.geometry.boundingBox) {
        const bbox = myMesh.geometry.boundingBox;
        const bboxHeight = bbox.max.y - bbox.min.y;
        height = bboxHeight * heightMultiplier;
    }

    // Calculate new position in XZ plane
    const x = Math.cos(angleRad) * radius;
    const z = Math.sin(angleRad) * radius;
    pointLight1.position.set(x, height, z);
    // pointLight2.position.set(-x, -y, -z);
});

document.getElementById('lightHeightSlider').addEventListener('input', function (e) {
    // Trigger the light slider to update position with new height
    document.getElementById('lightSlider').dispatchEvent(new Event('input'));
});



window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    if (outputMode === 'ascii' && effect) {
        effect.setSize(window.innerWidth, window.innerHeight);
    }
    if (currentProfile === 'wayne90x30') {
        applyWayneGrid();
    }
}

if (profileSelect) {
    profileSelect.addEventListener('change', (event) => {
        applyProfile(event.target.value);
    });
}

if (scanlineToggle) {
    scanlineToggle.addEventListener('change', (event) => {
        if (currentProfile !== 'wayne90x30') return;
        ensureScanlineStyle();
        asciiContainer.classList.toggle('ascii-scanlines', event.target.checked);
    });
    scanlineToggle.disabled = true;
}

if (cleanCutoffToggle) {
    cleanCutoffToggle.checked = cleanBackgroundEnabled;
    cleanCutoffToggle.addEventListener('change', (event) => {
        cleanBackgroundEnabled = event.target.checked;
        refreshCleanReadout();
        refreshEffectCharacters();
    });
}

if (cleanCutoffSlider) {
    cleanCutoffSlider.value = cleanBackgroundThreshold;
    cleanCutoffSlider.addEventListener('input', (event) => {
        cleanBackgroundThreshold = parseFloat(event.target.value) || cleanBackgroundThreshold;
        refreshCleanReadout();
        if (cleanBackgroundEnabled) {
            refreshEffectCharacters();
        }
    });
}

refreshCleanReadout();

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

document.getElementById("copyASCII").addEventListener("click", function () {
    if (outputMode !== 'ascii') {
        window.alert("ASCII output is disabled in Normal profile.");
        return;
    }
    var text = document.getElementsByTagName("table")[0].innerText
    var filename = "ASCII.txt";

    download(filename, text);
}, false);

document.getElementById("clipboardASCII").addEventListener("click", function () {
    if (outputMode !== 'ascii') {
        window.alert("ASCII output is disabled in Normal profile.");
        return;
    }
    const textArea = document.createElement("textarea");
    textArea.textContent = document.getElementsByTagName("td")[0].innerText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    window.alert("ASCII copied to clipboard");
}, false);

document.getElementById('scaleSlider').addEventListener('input', function (e) {
    const scale = parseFloat(e.target.value);
    myMesh.scale.set(scale, scale, scale);
});

// Rotation sliders logic
['X', 'Y', 'Z'].forEach(axis => {
    document.getElementById(`rotate${axis}Slider`).addEventListener('input', function (e) {
        const value = parseFloat(e.target.value) * Math.PI / 180;
        if (axis === 'X') {
            // Account for initial -90° position
            myMesh.rotation.x = value;
        } else {
            myMesh.rotation[axis.toLowerCase()] = value;
        }
    });
});

document.getElementById('rotateButton').addEventListener('click', function () {
    rotateModel = !rotateModel;
    updateRotateModelButtonUI();
});

document.getElementById('rotateLightButton').addEventListener('click', function () {
    rotateLight = !rotateLight;
    updateRotateLightButtonUI();
});

document.getElementById('resetButton').addEventListener('click', resetPositions);

function resetPositions() {
    // Reset model rotation and scale
    myMesh.scale.set(1, 1, 1);
    myMesh.rotation.set(-90 * Math.PI / 180, 0, 0);

    // Reset sliders to initial model position
    document.getElementById('scaleSlider').value = 1;
    document.getElementById('rotateXSlider').value = -90;
    document.getElementById('rotateYSlider').value = 0;
    document.getElementById('rotateZSlider').value = 0;
    document.getElementById('lightSlider').value = 45;
    document.getElementById('lightHeightSlider').value = 2;

    // Reset light position
    if (myMesh.geometry.boundingBox) {
        document.getElementById('lightSlider').dispatchEvent(new Event('input'));
    }


    // Stop rotations
    rotateModel = false;
    rotateLight = isMobileDevice;
    updateRotateLightButtonUI();
    updateRotateModelButtonUI();
}

document.getElementById('mobile-menu-button').addEventListener('click', function () {
    document.getElementById('ui-container').classList.toggle('hidden');
});
