import * as THREE from 'three';
import { WaterMesh } from 'three/addons/objects/WaterMesh.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

export let water, sun, sky;

//繼承模型color,roughness,matelness參數後套用咬花效果
export function EtchingEffect(target,map_src,map_repeat,map_offset,bumpMap_src,bumpMap_repeat,bumpMap_scale)
{
    let new_etching_material=new THREE.MeshPhysicalMaterial();
    
    target.traverse( function ( object ) {	
    
        if ( object.isMesh)
        {
            new_etching_material.color.set(object.material.color);
            new_etching_material.roughness=object.material.roughness;
            new_etching_material.metalness=object.material.metalness;
            new_etching_material.transparent= object.material.transparent;
            new_etching_material.opacity = object.material.opacity;
        }
    });
            
    new_etching_material.map = new THREE.TextureLoader().load(map_src);		
    new_etching_material.map.wrapS = THREE.RepeatWrapping;
    new_etching_material.map.wrapT = THREE.RepeatWrapping;
    new_etching_material.map.repeat.copy(map_repeat)
    new_etching_material.map.offset.copy(map_offset);
    
    const mapHeight = new THREE.TextureLoader().load(bumpMap_src);
    mapHeight.wrapS = THREE.RepeatWrapping;
    mapHeight.wrapT = THREE.RepeatWrapping;
    mapHeight.repeat.copy(bumpMap_repeat); // X, Y 重複次數
    new_etching_material.bumpMap= mapHeight,
    new_etching_material.bumpScale= bumpMap_scale;

    return new_etching_material;
}

export function InstEtchingMaterial(thisColor,thisRoughness,thisMetalness,thisReflectivity,isTransparent,thisOpacity,map_src,map_repeat,map_offset,bumpMap_src,bumpMap_repeat,bumpMap_scale)
{
    let new_etching_material=new THREE.MeshPhysicalMaterial();

    new_etching_material.color.set(thisColor);
    new_etching_material.roughness=thisRoughness;
    new_etching_material.metalness=thisMetalness;
    new_etching_material.reflectivity=thisReflectivity;
    new_etching_material.transparent=isTransparent;
    new_etching_material.opacity =thisOpacity;

    new_etching_material.map = new THREE.TextureLoader().load(map_src);		
    new_etching_material.map.wrapS = THREE.RepeatWrapping;
    new_etching_material.map.wrapT = THREE.RepeatWrapping;
    new_etching_material.map.repeat.copy(map_repeat)
    new_etching_material.map.offset.copy(map_offset);
    
    const mapHeight = new THREE.TextureLoader().load(bumpMap_src);
    mapHeight.wrapS = THREE.RepeatWrapping;
    mapHeight.wrapT = THREE.RepeatWrapping;
    mapHeight.repeat.copy(bumpMap_repeat); // X, Y 重複次數
    new_etching_material.bumpMap= mapHeight,
    new_etching_material.bumpScale= bumpMap_scale;

    return new_etching_material;
}

export function InstMaterial(thisColor,thisRoughness,thisMetalness,thisTransmission,thisIor,thisReflectivity,isTransparent,thisOpacity,isDepthWrite)
{
    let new_material=new THREE.MeshPhysicalMaterial();

    new_material.color.set(thisColor);
    new_material.roughness=thisRoughness;
    new_material.metalness=thisMetalness;
    new_material.transmission=thisTransmission;//0.0: 完全不透明（預設）。1.0: 完全透射（光線完全穿過，像清澈的玻璃）。
    new_material.ior=thisIor;//空氣: 1.0 水: 1.33 玻璃: 1.5 鑽石: 2.4
    new_material.reflectivity=thisReflectivity;
    new_material.transparent=isTransparent;
    new_material.opacity =thisOpacity;
    new_material.depthWrite=isDepthWrite;

    return new_material;
}

export function InstOceanEnvironment({waterNormalUrl='./textures/waternormals.jpg',waterSize=10,skyCloudCoverage=0.36,skyCloudDensity=0.84,skyCloudElevation=0.1,skySunElevation=60,skySunAzimuth=180}= {}) 
{
	sun = new THREE.Vector3();
	const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
	const loader = new THREE.TextureLoader();
	const waterNormals = loader.load(waterNormalUrl);
	waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

	water = new WaterMesh(waterGeometry, {
		waterNormals,
		sunDirection: new THREE.Vector3(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale: 3.7,
		size: waterSize,
		alpha: 1
	});

	water.rotation.x = -Math.PI / 2;

	sky = new SkyMesh();
	sky.scale.setScalar(10000);

	sky.turbidity.value       = 2;
	sky.rayleigh.value        = 2;
	sky.mieCoefficient.value  = 0.005;
	sky.mieDirectionalG.value = 0.8;
	sky.cloudCoverage.value   = skyCloudCoverage;
	sky.cloudDensity.value    = skyCloudDensity;
	sky.cloudElevation.value  = skyCloudElevation;

	const parameters = { elevation: skySunElevation, azimuth: skySunAzimuth };
	const phi   = THREE.MathUtils.degToRad(90 - parameters.elevation);
	const theta = THREE.MathUtils.degToRad(parameters.azimuth);
	sun.setFromSphericalCoords(1, phi, theta);

	sky.sunPosition.value.copy(sun);
	water.sunDirection.value.copy(sun).normalize();
}

export function UpdateSun(newElevation,newAzimuth)
{
    const phi = THREE.MathUtils.degToRad( 90 - newElevation );
	const theta = THREE.MathUtils.degToRad( newAzimuth );
	sun.setFromSphericalCoords( 1, phi, theta );
    sky.sunPosition.value.copy( sun );
    water.sunDirection.value.copy( sun ).normalize();
}


//高亮面反射clearcoat = 1.0, clearcoatRoughness = 0.05，
//半啞光保護漆：clearcoat = 0.5, clearcoatRoughness = 0.4
//關閉效果：clearcoat = 0.0
//僅支援MeshPhysicalMaterial材質
export function ClearCoatEffect(targetMaterial,clearcoat_value,clearcoatRoughness_value)
{
	targetMaterial.clearcoat= clearcoat_value;
	targetMaterial.clearcoatRoughness=clearcoatRoughness_value;
	targetMaterial.needsUpdate = true;
}