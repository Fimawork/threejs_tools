import * as THREE from 'three';

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