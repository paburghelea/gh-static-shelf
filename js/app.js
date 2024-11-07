/**
 * @author Paul
 */

let camera, controls, scene, renderer;


const store = {
  geometry: {
    shelves: {},
  },

  current: {
    height: null,
    id: null,
    u: null,
    v: null,
    width: null
  },

  parameters: {
    width: [],
    height: [],
    u: [],
    v: []
  }
}


let currentPanel = 0

//Material used in the scene
const highlightMaterial = new THREE.MeshStandardMaterial({ color: '#FF2400', metalness: 0.5 })
const defaultMaterial = new THREE.MeshStandardMaterial({ color: '#818589', metalness: 0.5 })
const wireframeMaterial = new THREE.MeshNormalMaterial({ color: 'white', wireframe: false })


init();
animate();



function unique(value, index, array) {
  return array.indexOf(value) === index;
}

/**
 * Get all the grid cells for the current size configuration
 * @returns 
 */

function getCurrentShelf() {
  console.log(store.current)
  return store.geometry.shelves.filter((item) => item.userData == store.current)[0]
}


function init() {

  //Create ThreeJS scenes
  initMainScene()

  //#region  Loader
  /**
   * Load the scene mode in the current scene
   */
  let loader = new THREE.ObjectLoader();

  loader.load(
    "./assets/shelf.json",
    function (obj) {
      // remove the loading text
      document.getElementById('progress').remove();
      scene = obj;


      const shelves = scene.children.filter((item) => item.name === 'shelf');


      store.geometry.shelves = shelves

      store.parameters.id = shelves.map((item) => item.userData.id).filter(unique).sort((a, b) => a - b)
      store.parameters.height = shelves.map((item) => item.userData.height).filter(unique).sort((a, b) => a - b)
      store.parameters.width = shelves.map((item) => item.userData.width).filter(unique).sort((a, b) => a - b)
      store.parameters.u = shelves.map((item) => item.userData.u).filter(unique).sort((a, b) => a - b)
      store.parameters.v = shelves.map((item) => item.userData.v).filter(unique).sort((a, b) => a - b)

      store.current = shelves[0].userData

      shelves.forEach((item) => {
        if (item.name === 'shelf') {
          scene.remove(item)
        }
      })

      updateScene()


      //Initialise the window events for the UI
      initUIEvents()
    },
    function (obj) {
      progressLog(obj)
    },
    function (err) {
      console.error('Cannot load scene!');
    }
  )
  //#endregion




}

function progressLog(message) {
  let progress, textNode, text;

  if (document.getElementById('progress')) {
    document.getElementById('progress').remove();
  }

  if (message.lengthComputable) {
    text = 'loading: ' + Math.round((message.loaded / message.total * 100)) + '%'
  } else {
    text = 'loading: ' + Math.round(message.loaded / 1000) + 'kb'
  }

  console.log(text);

  progress = document.createElement('DIV');
  progress.id = 'progress';
  textNode = document.createTextNode(text);
  progress.appendChild(textNode)
  container.appendChild(progress)
}



function animate() {

  requestAnimationFrame(animate);

  controls.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

/**
 * Set the current panel in memory
 * @param {string} id ID of the current panel 
 */
function setCurrentShelf(id) {

  shelves = store.geometry.shelves

  try {
    store.current = shelves.filter((shelf) => shelf.userData.id === id)[0].userData
  }
  catch (err) {
    console.log(`Cannot set ${id}!`)
  }

}



function initMainScene() {
  scene = new THREE.Scene();
  container = document.getElementById('container');

  // create the rendered and set it to the height/width of the container
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true; // if you don't want shadows, set to false
  container.appendChild(renderer.domElement);
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.5, 800000);
  camera.position.set(-2000, 2000, -2000); // starting position of the camera

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.screenSpacePanning = true;
  controls.maxPolarAngle = Math.PI / 2;
  controls.maxDistance = 10000;
  controls.minDistance = 2000;
  controls.enablePan = false;
}


function initUIEvents() {

  let prevSelection = null;


  /**
   * Track the mouse click function on the placed panels
   * On click we replace the panel with the current selection from the `Select Panel`
   */
  document.addEventListener('mousedown', function (e) {
    if (e.button != 2)
      return

    let mouse3D = new THREE.Vector3((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 0.5);


    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse3D, camera)

    const intersects = raycaster.intersectObjects(scene.children.filter((object) => object.name === 'target' || object.name === 'panel'))


    if (intersects.length > 0) {

      if (prevSelection != null)
        prevSelection.material = defaultMaterial

      const object = intersects[0].object


      switch (object.name) {
        case 'target': {
          const index = getCurrentGrid().indexOf(object)
          changeCell(index)
          break;
        }

        case 'panel': {
          const panel = store.geometry.panels[store.current.size][0][currentPanel].clone()

          panel.position.copy(object.position);

          panel.rotation.x = 1.571
          panel.rotation.z = 1.571

          scene.add(panel)

          scene.remove(object)

          break;
        }

        default:
          break;
      }

      prevSelection = object
    }
  });


  /**
   * Update the camera and render functions after the browser window is resized
   */
  window.addEventListener('resize', function (e) {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()

    renderer.setSize(container.clientWidth, container.clientHeight)

  }, false)



  // Height dropdown
  const heightDropdown = document.getElementById("height-dropdown")

  store.parameters.height.map((param) => {
    const option = document.createElement("option")
    option.text = param
    heightDropdown.add(option);
  })

  heightDropdown.addEventListener("change", function (e) {
    e.preventDefault()

    try {
      store.current.height = e.target.value
      updateScene()
    }
    catch (err) {
      console.log(err)
    }
  })



  // Height dropdown
  const widthDropdown = document.getElementById("width-dropdown")

  store.parameters.width.map((param) => {
    const option = document.createElement("option")
    option.text = param
    widthDropdown.add(option);
  })

  widthDropdown.addEventListener("change", function (e) {
    e.preventDefault()

    try {
      store.current.width = e.target.value
      updateScene()
    }
    catch (err) {
      console.log(err)
    }
  })



  // U dropdown
  const uDropdown = document.getElementById("u-dropdown")

  store.parameters.u.map((param) => {
    const option = document.createElement("option")
    option.text = param
    uDropdown.add(option);
  })

  uDropdown.addEventListener("change", function (e) {
    e.preventDefault()

    try {
      store.current.u = e.target.value
      updateScene()
    }
    catch (err) {
      console.log(err)
    }
  })


  // V dropdown
  const vDropdown = document.getElementById("v-dropdown")

  store.parameters.v.map((param) => {
    const option = document.createElement("option")
    option.text = param
    vDropdown.add(option);
  })

  vDropdown.addEventListener("change", function (e) {
    e.preventDefault()

    try {
      store.current.v = e.target.value
      updateScene()
    }
    catch (err) {
      console.log(err)
    }
  })
}

function updateScene() {

  const prev = scene.children.filter((item) => item.name === "shelf")
  prev.forEach((shelf) => scene.remove(shelf))

  const shelf = getCurrentShelf()

  console.log([shelf.userData, store.current])

  shelf.material = defaultMaterial
  scene.add(shelf)
}
