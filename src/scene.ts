import type { Vector3 } from 'three';
import * as THREE from 'three';
import { createSlicedTextures, getClippedRegion } from './helpers/image';
import { OrbitControls } from './three-plugins/orbitcontrols'

let width = 0
let height = 0

let camera, scene, renderer, plane;
let tileSize = 32
let gridHelper
let pointer, raycaster
let rollOverMesh
let controls

let gridNumber

const sizeTiles = 50

const gridObjects = {}

const mapSize = () => {
    return tileSize * sizeTiles
}

const cubeGeometry = () => {
    return new THREE.BoxGeometry(tileSize, tileSize, tileSize)
}

const objects = []

const setupCamera = () => {
    camera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 )
    camera.position.set( 500, 800, 1300 )
    camera.lookAt( 0, 0, 0 )
}

const setupScene = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );    
}

const setupMeshHelper = () => {
    const rollOverGeo = cubeGeometry();
    const rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    scene.add( rollOverMesh );
}

const setupGrid = () => {
    gridHelper = new THREE.GridHelper( 1000, numberOfTiles())
    scene.add( gridHelper );

    const geometry = new THREE.PlaneGeometry( mapSize(), mapSize() )
    geometry.rotateX( - Math.PI / 2 )

    plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
    scene.add( plane );

    objects.push(plane)

    raycaster = new THREE.Raycaster()

    pointer = new THREE.Vector2()    
}

export const updateGrid = (size) => {
    tileSize = size < 16 ? 16 : size
    scene.remove(gridHelper)
    gridHelper = new THREE.GridHelper(mapSize(), numberOfTiles())
    scene.add(gridHelper)    

    plane.geometry.dispose()
    
    const geometry = new THREE.PlaneGeometry(mapSize(), mapSize())
    geometry.rotateX(- Math.PI / 2)

    plane.geometry = geometry

    rollOverMesh.geometry.dispose()
    rollOverMesh.geometry = cubeGeometry()
}

export const updateColor = (color: string) => {
    rollOverMesh.material.dispose()
    const hex = parseInt(color.replace(/^#/, ''), 16)
    const material = new THREE.MeshBasicMaterial( { color: hex, opacity: 0.5, transparent: true } );
    rollOverMesh.material = material
}

const init = () => {
    setupCamera()
    setupScene()
    setupMeshHelper()
    setupGrid()
}

const update = () => {
    requestAnimationFrame(update)
    renderer.render(scene, camera)
    scene.updateMatrixWorld()
}

const numberOfTiles = () => {
    return mapSize() / tileSize
}

export const createScene = (el: HTMLElement, initialTiles: number) => {    
    tileSize = initialTiles
    width = el.offsetWidth
    height = el.offsetHeight

    init()

    renderer = new THREE.WebGLRenderer({ antialias: false, canvas: el })
    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize( width, height )
    renderer.render( scene, camera )
    
    controls = new OrbitControls(camera, el)
    controls.update()

    update()
}

/**
 * Events
 */

const getEventMouseCoordinates = (event: PointerEvent) => {
    var rect = renderer.domElement.getBoundingClientRect();
    const mouse: {x: number, y: number} = {x: 0, y: 0}
    mouse.x = ( ( event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    mouse.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;

    return mouse
}

let textureMap = {
    staticBlocks: {},
    blocks: {}
}

const grassMaterial = (isStatic = false) => {
    const map = isStatic ? textureMap.staticBlocks : textureMap.blocks

    if (!map['grass']) {
        map['grass'] = createSlicedTextures('/tile.png', 3, 48, 144, isStatic)
    }


    return map['grass']
}

const vectorKey = (vector: Vector3) => {
    return `${vector.x}/${vector.y}/${vector.z}`
}

const onPointerDown = (event: PointerEvent) => {
    const mouse = getEventMouseCoordinates(event)
    pointer.set( mouse.x, mouse.y );

    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObjects( objects, false );

    if ( intersects.length > 0 ) {

        const intersect = intersects[ 0 ];

        const voxel = new THREE.Mesh( cubeGeometry(), grassMaterial() );
        voxel.position.copy( intersect.point ).add( intersect.face.normal );
        voxel.position.divideScalar( tileSize ).floor().multiplyScalar( tileSize ).addScalar( tileSize / 2 );

        const intersection = intersect.point.clone().divideScalar(tileSize).floor()

        if (gridObjects[vectorKey(intersection)]) {
            console.log(vectorKey(intersection))
            return
        }

        scene.add( voxel );
        objects.push( voxel );
        gridObjects[vectorKey(intersection)] = voxel

        const beneath = new THREE.Vector3(intersection.clone().x, intersection.clone().y - 1, intersection.clone().z)

        const lowerBlock = gridObjects[vectorKey(beneath)]

        document.dispatchEvent(new CustomEvent('gridupdated', {detail: {grid: gridObjects, coordinates: intersection}}))

        if(lowerBlock) {
            lowerBlock.material.forEach(m => m.dispose)
            lowerBlock.material = grassMaterial(true)
        }
    }
}



const onPointerMove = (event: PointerEvent) => {
    console.log(camera.near, camera.far)

    const mouse = getEventMouseCoordinates(event)
    pointer.set( mouse.x, mouse.y);

    raycaster.setFromCamera( pointer, camera );

    const intersects = raycaster.intersectObjects( objects, false );

    if ( intersects.length > 0 ) {

        const intersect = intersects[ 0 ];

        const coordinates = intersect.point.clone().divideScalar(tileSize).floor()
        document.dispatchEvent(new CustomEvent('gridhover', { detail: {
            coordinates: {
                x: coordinates.x,
                y: coordinates.y,
                z: coordinates.z
            }
        } }))

        rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
        rollOverMesh.position.divideScalar( tileSize ).floor().multiplyScalar( tileSize ).addScalar( Math.floor(tileSize / 2) );
    }

}

document.addEventListener( 'pointermove', onPointerMove )
document.addEventListener( 'pointerup', onPointerDown )
document.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize( window.innerWidth, window.innerHeight )
})