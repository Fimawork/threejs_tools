import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { UltraHDRLoader } from 'three/addons/loaders/UltraHDRLoader.js';
//import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// WebGPU 影子工具
import { vec3, uniform, texture, depth, float } from 'three/tsl';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';

//轉USDZ檔案格式工具
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';

import Stats from 'three/addons/libs/stats.module.js';

export let targetPosition=null;

export let CameraDefaultPos, ControlsTargetDefaultPos;

///建議設置默認位置 posData[0]={ camera_pos:CameraDefaultPos, controlsTarget_pos:ControlsTargetDefaultPos};
///可自行擴充點位，EX:posData[1]={ camera_pos:new THREE.Vector3(267.359,339.340,302.847), controlsTarget_pos:new THREE.Vector3(-22.364,-14.285,25.345)};
export let posData=[]=[{ camera_pos:new THREE.Vector3(0, 5, 5), controlsTarget_pos:new THREE.Vector3(0, 0, 0)}];

export const dracoLoader = new DRACOLoader();

//須放置在init()內
export function SetupEnvironment(setting)
{
    if(setting==="onPrem")
    {
        //draco模組
        dracoLoader.setDecoderPath( './jsm/libs/draco/' );
        dracoLoader.preload();
    }

    if(setting==="cloud")
    {
        //draco模組
        dracoLoader.setDecoderPath( 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/' );
        dracoLoader.preload();
    }
}

//let camera_position=[{ camera_pos: new THREE.Vector3(0, 0, 0), controlsTarget_pos: new THREE.Vector3(0, 0, 0) }];
const camera_controls_params = {
	camera_x:0,
	camera_y:0,
	camera_z:0,
	controlsTarget_x:0,
	controlsTarget_y:0,
	controlsTarget_z:0
};

const stats = new Stats();

///main.js
//import {CameraDefaultPos,ControlsTargetDefaultPos} from "/main.js";

export function CameraManager(i)
{
    targetPosition=posData[i];
}

export function SetDefaultCameraStatus(thisCameraDefaultPos,thisControlsTargetPos)
{
	CameraDefaultPos=thisCameraDefaultPos;
	ControlsTargetDefaultPos=thisControlsTargetPos;
}

export function UpdateCameraPosition(thisCamera,thisControls)//修正命名，原為UpdateCamerRotation
{
	const interpolation = 0.1; //鏡頭飛行時，平移的速度
    const threahold=0.01;//飛行至目標座標時，相機模組的中心與目標座標的停止距離

	if(targetPosition!=null)
	{
		if(thisCamera.position.distanceTo(targetPosition.camera_pos)>threahold||thisControls.target.distanceTo(targetPosition.controlsTarget_pos)>threahold)
    	{
			thisCamera.position.lerpVectors(thisCamera.position,targetPosition.camera_pos,interpolation);
			thisControls.target.lerpVectors(thisControls.target,targetPosition.controlsTarget_pos,interpolation);
    	}

		else
		{
			targetPosition=null;
		}
	}

    thisControls.update();
}

export function RealtimeCameraTarget(target,thisCamera,distanceLerp,relativeHeight,zoom_threahold)
{
    let newCameraPos=new THREE.Vector3(LerpFloat(thisCamera.position.x,target.position.x,distanceLerp), target.position.y+relativeHeight,LerpFloat(thisCamera.position.z,target.position.z,distanceLerp));

    let newControlsTargetPos=target.position;

    if(thisCamera.position.distanceTo(target.position)>zoom_threahold)
    {
        targetPosition={ camera_pos:newCameraPos, controlsTarget_pos:newControlsTargetPos};
    }
}

export function SceneTag(target,lable,offset,targetCam)  
{
	try 
	{
		var width = window.innerWidth, height = window.innerHeight;
	    var widthHalf = width / 2, heightHalf = height / 2;
		const worldPosition = new THREE.Vector3();
		target.getWorldPosition(worldPosition);
		var pos_3D = worldPosition.clone()
	    //var pos_3D = _target.position.clone();///object.position 取得的是相對座標（即該物體相對於其父物體的座標），而不是世界座標。

	    pos_3D.project(targetCam);
	    pos_3D.x = ( pos_3D.x * widthHalf ) + widthHalf;
	    pos_3D.y = - ( pos_3D.y * heightHalf ) + heightHalf;

		lable.style.cssText = `position:absolute;top:${pos_3D.y/height*100+offset.y}%;left:${pos_3D.x/width*100+offset.x}%;`;
	}

	catch (error) 
	{
		console.log(`Error Setting Camera Default Property.${error}`);
	}
}

export function InstFBXLoader(filePath,thisPos,thisRot,thisScale,thisName,thisParent,thisScene)
{
    let thisObject =new THREE.Object3D();

    const loader = new FBXLoader();
    loader.load( filePath, function ( object ) {
        
        for(let i=0;i<object.children.length;i++)
        {
            thisObject.add(object);
        }

        thisObject.position.copy(thisPos);
        thisObject.rotation.set(thisRot.x, thisRot.y, thisRot.z);
        thisObject.scale.set(thisScale,thisScale,thisScale);
        
        if(thisParent!=null)
        {
            thisParent.add(thisObject)
        }

        else
        {
            thisScene.add( thisObject );
        }
        
        thisObject.name=thisName;
    } );
}


export function InstGLTFLoader(filePath,thisPos,thisRot,thisScale,thisName,thisParent,thisScene)
{
	const loader = new GLTFLoader();
	loader.load( filePath, function ( gltf ) {

		const model = gltf.scene;
		model.position.copy(thisPos);
		model.rotation.set(thisRot.x, thisRot.y, thisRot.z);
		model.scale.set(thisScale,thisScale,thisScale);
		model.name=thisName;

		if(thisParent!=null)
		{
			thisParent.add(model)
		}

		else
		{
			thisScene.add( model );
		}

	});
}

export function InstGLTFDracoLoader(filePath,thisPos,thisRot,thisScale,thisName,thisParent,thisScene)
{
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load( filePath, function ( gltf ) {

        const model = gltf.scene;
        model.position.copy(thisPos);
        model.rotation.set(thisRot.x, thisRot.y, thisRot.z);
        model.scale.set(thisScale,thisScale,thisScale);
        model.name=thisName;

        if(thisParent!=null)
        {
            thisParent.add(model)
        }

        else
        {
            thisScene.add( model );
        }

    });
}

//加密模組
export function Base64ToArrayBuffer(base64) 
{
	// 去除所有非 base64 字元
	base64 = base64.replace(/[^A-Za-z0-9+/=]/g, "");

	const binary = atob(base64);
	const len = binary.length;
	const bytes = new Uint8Array(len);

	for (let i = 0; i < len; i++) 
	{
	    bytes[i] = binary.charCodeAt(i);
	}

	return bytes.buffer;
}


export function InstGLTFDracoBase64Loader(base64String,thisPos,thisRot,thisScale,thisName,thisParent,thisScene)
{

	const arrayBuffer = Base64ToArrayBuffer(base64String);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    loader.parse(
        arrayBuffer,
        '',
        (gltf) => {
            
            const model = gltf.scene;
            model.position.copy(thisPos);
            model.rotation.set(thisRot.x, thisRot.y, thisRot.z);
            model.scale.set(thisScale,thisScale,thisScale);
            model.name=thisName;

            if(thisParent!=null)
            {
                thisParent.add(model)
            }

            else
            {
                thisScene.add( model );
            }

        },
        (error) => {
            console.error('Failed to load model:', error);
        }
    );
}

//搭配其他GLTF Loader使用，用來降低Drawcall，提高效能。
export function ReturnBufferGeometry(target,thisMaterial,thisParent,thisScene)
{
    const geometries = [];
    const defaultMaterial= new THREE.MeshStandardMaterial();

    target.traverse( function ( object ) {	

        if ( object.isMesh && object.geometry)
        {
            if(thisMaterial==null)
            {
                defaultMaterial.color.set(object.material.color);
                defaultMaterial.roughness=object.material.roughness;
                defaultMaterial.metalness=object.material.metalness;
                defaultMaterial.transparent= object.material.transparent;
                defaultMaterial.opacity = object.material.opacity;
                defaultMaterial.needsUpdate = true;
            }

            object.updateWorldMatrix(true, false);
            const clonedGeo = object.geometry.clone();
            clonedGeo.applyMatrix4(object.matrixWorld);
            geometries.push(clonedGeo);  
        }
    })

    target.visible=false;
    
    const mergedGeo = mergeGeometries( geometries, true);	
    let mergedMesh;

    if(thisMaterial==null)
    {
        mergedMesh = new THREE.Mesh(mergedGeo, defaultMaterial);
    }

    else
    {
        mergedMesh = new THREE.Mesh(mergedGeo, thisMaterial);
    }
    
    mergedMesh.name="BufferGeometry_"+target.name;

    if(thisParent!=null)
    {
        thisParent.attach(mergedMesh)
    }

    else
    {
        thisScene.add( mergedMesh );
    }
}

export function InstTiffLoader(thisObject,filePath,thisPos,thisRot,thisScale,tintColor, opacity, thisParent, thisScene)
{
    const loader = new TIFFLoader();
    const geometry = new THREE.PlaneGeometry();
    loader.load( filePath, function ( texture ) 
    {
        texture.colorSpace = THREE.SRGBColorSpace;
    
        const material = new THREE.MeshBasicMaterial( { color: tintColor,map: texture, transparent: true, blending: THREE.AdditiveBlending,side: THREE.DoubleSide,opacity:opacity,depthWrite: false } );
        const mesh = new THREE.Mesh( geometry, material );
        const imageWidth = texture.image.width*0.01;
        const imageHeight = texture.image.height*0.01;
        
        mesh.position.copy(thisPos);
        mesh.scale.set(thisScale.x*imageWidth,thisScale.y*imageHeight,1);
        mesh.rotation.set(thisRot.x, thisRot.y, thisRot.z);
        thisObject.add(mesh);	
        
        if(thisParent!=null)
        {
            thisParent.add(thisObject)
        }
    
        else
        {
            thisScene.add( thisObject );
        }
        
    });
}

export function InstLineMesh(target_A,target_B,thisMaterial,thisScale,thisName,thisParent,thisScene) 
{
    const thisLineMesh =new THREE.Object3D();
    
    const pos_A = new THREE.Vector3();
    target_A.getWorldPosition(pos_A);

    const pos_B = new THREE.Vector3();
    target_B.getWorldPosition(pos_B);

    const destinations = new THREE.CatmullRomCurve3([pos_A, pos_B]);
    const extrusionSegments=100;
    const radiusSegments=30;
    const closed=false;
    const tubeGeometry = new THREE.TubeGeometry( destinations, extrusionSegments, thisScale, radiusSegments, closed );
    const mesh = new THREE.Mesh( tubeGeometry, thisMaterial );
    
    thisLineMesh.add( mesh );
    thisLineMesh.name=thisName;

    //thisScene.add(thisLineMesh);

    if(thisParent!=null)
    {
        thisParent.add(thisLineMesh)
    }
    
    else
    {
        thisScene.add( thisLineMesh );
    }
}

export function InstCurveLineMesh(target_A,target_B,thisMaterial,thisScale,thisHeight,thisName,thisParent,thisScene,thisLightBallColor) 
{
    const thisLineMesh =new THREE.Object3D();

    const pos_A = new THREE.Vector3();
    target_A.getWorldPosition(pos_A);

    const pos_B = new THREE.Vector3();
    target_B.getWorldPosition(pos_B);

    const pos_Middle = new THREE.Vector3((pos_A.x+pos_B.x)/2,thisHeight,(pos_A.z+pos_B.z)/2);

    const pos_Middle_A = new THREE.Vector3((pos_A.x+pos_Middle.x)/2,0.8*thisHeight,(pos_A.z+pos_Middle.z)/2);

    const pos_Middle_B = new THREE.Vector3((pos_Middle.x+pos_B.x)/2,0.8*thisHeight,(pos_Middle.z+pos_B.z)/2);

    const destinations = new THREE.CatmullRomCurve3([pos_A,pos_Middle_A, pos_Middle,pos_Middle_B,pos_B]);
    destinations.curveType = 'centripetal';
    const extrusionSegments=100;
    const radiusSegments=30;
    const closed=false;
    const tubeGeometry = new THREE.TubeGeometry( destinations, extrusionSegments, thisScale, radiusSegments, closed );
    const mesh = new THREE.Mesh( tubeGeometry, thisMaterial );
    
    thisLineMesh.add( mesh );
    thisLineMesh.name=thisName;

    const geometry = new THREE.SphereGeometry( 1.5, 32, 16 ); 
    const material = new THREE.MeshBasicMaterial({color: thisLightBallColor});
    const ball = new THREE.Mesh( geometry, material );
    const clock = new THREE.Clock();
    let step=0;

    if(thisLightBallColor!=null)
    { 
        thisScene.add( ball );
        TrafficAnim();
    }
    
    if(thisParent!=null)
    {
        thisParent.add(thisLineMesh)
    }
    
    if(thisParent===null)
    {
        thisScene.add( thisLineMesh );
    }

    function TrafficAnim()
    {
        requestAnimationFrame(TrafficAnim);
        step=THREE.MathUtils.pingpong (clock.elapsedTime-clock.getDelta(), 1);
        ball.position.copy(destinations.getPoint(step));
    }
}

export function SetupDafaultMaterial(filePath , defultMaterial)
{
	let i=0;

	const loader = new FBXLoader();
	loader.load( filePath, function ( object ) {

		object.traverse( function ( object ) {

			if ( object.isMesh )
			{
				defultMaterial[i]=object.material;
				i++;
			}
		})
	});

}
	

export function SwitchMaterial(thisObject , defultMaterial, newMaterial)
{	
	if(newMaterial!=null)
	{
		let i=0;

		thisObject.traverse( function ( object ) {

			if ( object.isMesh )
			{
				object.material=newMaterial;
			}

		});
	}

	else
	{		
		let j=0;

		thisObject.traverse( function ( object ) {

			if ( object.isMesh )
			{
				object.material=defultMaterial[j];
				j++;
			}

		});	
	}
}

export function Camera_Inspector(targetCamera,thisControls)
{
    const params = 
    {
        copyCameraPositionData: function() 
        {
            const camera_position = `${camera_controls_params.camera_x},${camera_controls_params.camera_y},${camera_controls_params.camera_z}`;

            // 調用剪貼簿 API
            navigator.clipboard.writeText(camera_position).then(() => {
                console.log('座標已複製到剪貼簿:', camera_position);

                // 選做：給使用者一點視覺回饋
                alert('座標已複製！\n' + camera_position);
            }).catch(err => {
                console.error('複製失敗', err);
            });
        },

        copyControlsTargetData: function() 
        {
            const controls_target = `${camera_controls_params.controlsTarget_x},${camera_controls_params.controlsTarget_y},${camera_controls_params.controlsTarget_z}`;

            // 調用剪貼簿 API
            navigator.clipboard.writeText(controls_target).then(() => {
                console.log('座標已複製到剪貼簿:', controls_target);

                // 選做：給使用者一點視覺回饋
                alert('座標已複製！\n' + controls_target);
            }).catch(err => {
                console.error('複製失敗', err);
            });
        }
    };

    const gui = new GUI();
    const CameraTransform = gui.addFolder( 'Camera Position' );

    CameraTransform.add( camera_controls_params, 'camera_x').listen();

    CameraTransform.add( camera_controls_params, 'camera_y').listen();

    CameraTransform.add( camera_controls_params, 'camera_z').listen();

    CameraTransform.add( params, 'copyCameraPositionData' ).name('Copy Camera Position');

    const ControlsTransform = gui.addFolder( 'ControlsTarget Position' );

    ControlsTransform.add( camera_controls_params, 'controlsTarget_x').listen();

    ControlsTransform.add( camera_controls_params, 'controlsTarget_y').listen();

    ControlsTransform.add(camera_controls_params, 'controlsTarget_z').listen();

    ControlsTransform.add( params, 'copyControlsTargetData' ).name('Copy Controls Target');

    FetchCameraPivotPosition();

    function FetchCameraPivotPosition()
    {
        requestAnimationFrame(FetchCameraPivotPosition);

        camera_controls_params.camera_x=targetCamera.position.x.toFixed(3);
        camera_controls_params.camera_y=targetCamera.position.y.toFixed(3);
        camera_controls_params.camera_z=targetCamera.position.z.toFixed(3);

        camera_controls_params.controlsTarget_x=thisControls.target.x.toFixed(3);
        camera_controls_params.controlsTarget_y=thisControls.target.y.toFixed(3);
        camera_controls_params.controlsTarget_z=thisControls.target.z.toFixed(3);
    }
}


export async function SetSVGFillColor(thisSVGObject,thisFillColor)
{
    try {
         
        const obj = document.getElementById(thisSVGObject);
        const svgDoc = obj.contentDocument;

        svgDoc.querySelectorAll('path').forEach((path) => {
            path.setAttribute('fill', thisFillColor);
        });
          
        svgDoc.querySelectorAll('polygon').forEach((polygon) => {
            polygon.setAttribute('fill', thisFillColor);
        });

        svgDoc.querySelectorAll('rect').forEach((rect) => {
            rect.setAttribute('fill', thisFillColor);
        });
 
    }

    catch (error) {
        console.error('Error checking SVG tags:', error);
    }
}

export function ImageBlinkingEffect(thisImage,cssEffect)
{
    const target = document.getElementById(thisImage);
    target.classList.add(cssEffect);
}

export function InputEvent()
{
    if(targetPosition!=null)
    {
        targetPosition=null
    }
}

export function InputEventListener(targetElement)
{
    let isMouseLeftPressed=false;
    var newPointerXValue=0;
    var newPointerYValue=0;
    var currentPointerXValue=0;
    var currentPointerYValue=0;

    targetElement.addEventListener( 'pointermove', (event)=>{

        newPointerXValue=event.clientX;
        newPointerYValue=event.clientY;

        if(isMouseLeftPressed)
        {
            if(Math.abs(newPointerXValue-currentPointerXValue)>10||Math.abs(newPointerYValue-currentPointerYValue)>10)
            {
                if(targetPosition!=null)
                {
                    targetPosition=null;
                }
            }
        }
    });

    targetElement.addEventListener("pointerdown", (event) => {
        
        isMouseLeftPressed=true;
        currentPointerXValue=newPointerXValue;
        currentPointerYValue=newPointerYValue;

    });

    targetElement.addEventListener("pointerup", (event) => {

        isMouseLeftPressed=false;

    });

    targetElement.addEventListener("wheel", (event) => {

        if(targetPosition!=null)
        {
            targetPosition=null;
        }
        
  });
}

export function FindMataterialByName(thisName,thisMaterial,thisScene)
{
    thisScene.traverse(function (child){

      if (child.isMesh && child.material) {
        const material = child.material;

        // 單一材質情況
        if (material.name === thisName) {
          console.log("找到了！", material);
          console.log("找到了！", material.type);
          thisMaterial=material;
        }

        // 如果是多重材質（Array）
        if (Array.isArray(material)) {
          material.forEach(mat => {
            if (mat.name === thisName) {
              console.log("找到了一個在陣列中的材質：", mat);
              console.log("找到了一個在陣列中的材質：", mat.type);
              thisMaterial=mat;
            }
          });
        }
      }

    });
}

export function Material_Editor(target,param)
{
    const targetMaterial= new THREE.MeshStandardMaterial();
    
    targetMaterial.color.set(param.color);
    targetMaterial.roughness=param.roughness;
    targetMaterial.metalness=param.metalness;
    
    if(param.texture_img!=null)
    {
        const loader = new THREE.TextureLoader();
        targetMaterial.map = loader.load(param.texture_img);
        targetMaterial.map.wrapS = THREE.RepeatWrapping;
        targetMaterial.map.wrapT = THREE.RepeatWrapping;
        targetMaterial.map.repeat.set(param.texture_repeat_x, param.texture_repeat_y);
        targetMaterial.map.offset.set(param.texture_offset_x, param.texture_offset_y);
    }

    if(param.normalMap_img!=null)
    {
        const loader_normal = new THREE.TextureLoader();
        targetMaterial.normalMap = loader_normal.load(param.normalMap_img);
        targetMaterial.normalScale.set(param.normal_scale, param.normal_scale);  
    }
    
    targetMaterial.transparent= param.transparent;
    targetMaterial.alphaHash= param.alphahash;
    targetMaterial.opacity = param.opacity;
    targetMaterial.needsUpdate = true;

    target.traverse( function ( object ) {
        if ( object.isMesh )
        {	
            object.material=targetMaterial;
        }
    });
}

//搭配Material_Editor使用
const param_ = {
	color:0xff9900,
    roughness:0.1,
    metalness:0.9,
    texture_img:'./textures/Patina copper_200_DB.jpg',
    texture_repeat_x:5,
    texture_repeat_y:5,
    texture_offset_x:0,
    texture_offset_y:0,
    normalMap_img:'./textures/Patina copper_200_DB.jpg',
    normal_scale:2,
    transparent:false,
    alphahash:false,
    opacity:1
};

//以Mesh名稱搜尋材質球
export function Material_Inspector(thisScene) 
{
    const gui = new GUI();
    gui.title('材質檢查器A');

    let material= new THREE.MeshPhysicalMaterial( {
		color: 0xffffff, metalness: 0.25, roughness: 0, transmission: 1.0
    } );

    let entity_list=[];

    thisScene.traverse((child) => {
        if (child.name !="") 
        {
            entity_list.push(child.name);   
        }
    });

    let item ={name: entity_list[0],};

    
    function UpdateItem()
    {
        thisScene.getObjectByName(item.name).traverse( function ( object ) {
            if ( object.isMesh )
            {	
                material=object.material;
            }
        });

        UpdateContent();
    }

    ///設定初始化時的材質球
    thisScene.getObjectByName(entity_list[0]).traverse( function ( object ) {
        if ( object.isMesh )
        {	
            material=object.material;
        }
    });

    const excludeKeyword ="mesh_";

    entity_list = entity_list.filter(n => !n.includes(excludeKeyword));

    gui.add( item, 'name', entity_list ).onChange( function () {

        UpdateItem();
	});

    function FetchHexColor(targetMaterial)
    {
        const hex = targetMaterial.color.getHexString().toUpperCase();

        // 拼湊成你想要的格式
        const finalFormat = '0x' + hex;

        return finalFormat;
    }

    let sub_gui;

    UpdateContent();;

    function UpdateContent()
    {  
        if (sub_gui) 
        {
            sub_gui.destroy();
        }


        sub_gui = new GUI();
        sub_gui.domElement.style.top = '53px';
        sub_gui.title(`屬性調整: ${item.name}`);
        const basicGui = sub_gui.addFolder("基礎參數 (Basic)");

        basicGui.addColor({ color: material.color.getHex() }, 'color')
        .name('顏色 (Color)')
        .onChange(v => material.color.set(v));

        if(material.roughness!=null)basicGui.add(material, 'roughness', 0, 1 ).name('粗糙度 (Roughness)');;
        if(material.metalness!=null)basicGui.add(material, 'metalness', 0, 1 ).name('金屬度 (Metalness)');
        if(material.transmission!=null)basicGui.add(material, 'transmission', 0, 1 ).name('穿透度 (Transmission)');
        if(material.ior!=null)basicGui.add(material, 'ior', 1, 2.4 ).name('折射率 (IOR)');
        if(material.reflectivity!=null)basicGui.add(material, 'reflectivity', 0, 1 ).name('反射率 (Reflectivity)');
        if(material.transparent!=null)basicGui.add(material, 'transparent').name('透明開啟 (Transparent)');
        if(material.opacity!=null)basicGui.add(material, 'opacity', 0, 1, 0.01).name('不透明度 (Opacity)');
        if(material.depthWrite!=null)basicGui.add(material, 'depthWrite').name('深度寫入 (DepthWrite)');

        if(material.map!=null)
        {
            const map_texture=material.map;
            const mapGui = sub_gui.addFolder("Map Parameter");
            mapGui.add(map_texture.repeat, "x", 0, 2000, 0.1).name("平鋪 X (Repeat)").onChange(() => map_texture.needsUpdate = true);
            mapGui.add(map_texture.repeat, "y", 0, 2000, 0.1).name("平鋪 Y (Repeat)").onChange(() => map_texture.needsUpdate = true);
            mapGui.add(map_texture.offset, "x", -1, 1, 0.01).name("偏移 X (Offset)").onChange(() => map_texture.needsUpdate = true);
            mapGui.add(map_texture.offset, "y", -1, 1, 0.01).name("偏移 Y (Offset)").onChange(() => map_texture.needsUpdate = true);
        }

        if(material.bumpMap!=null)
        {
            const bumpMap_texture=material.bumpMap;
            const bumpMapGui = sub_gui.addFolder("凹凸貼圖 (BumpMap Parameter)");
            bumpMapGui.add(bumpMap_texture.repeat, "x", 0, 2000, 0.1).name("平鋪 X (Repeat)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(bumpMap_texture.repeat, "y", 0, 2000, 0.1).name("平鋪 Y (Repeat)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(bumpMap_texture.offset, "x", -1, 1, 0.01).name("偏移 X (Offset)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(bumpMap_texture.offset, "y", -1, 1, 0.01).name("偏移 Y (Offset)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(material, "bumpScale", -100, 100, 0.01).name("凹凸強度").onChange(() => bumpMap_texture.needsUpdate = true);
        }


        const params = 
        {
            copyEtchingMaterialData: function() //InstEtchingMaterial(thisColor,thisRoughness,thisMetalness,thisReflectivity,isTransparent,thisOpacity,map_src,map_repeat,map_offset,bumpMap_src,bumpMap_repeat,bumpMap_scale)
            {
                const etchingMaterial_data = `${FetchHexColor(material)},${material.roughness},${material.metalness},${material.reflectivity},${material.transparent},${material.   opacity},"${formatToRelativePath(material.map.image.src)}",new THREE.Vector2(${material.map.repeat.x},${material.map.repeat.y}),new THREE.Vector2(${material.map.  offset.x},${material.map.offset.y}),"${formatToRelativePath(material.bumpMap.image.src)}",new THREE.Vector2(${material.bumpMap.repeat.x},${material.bumpMap.repeat.   y}),${material.bumpScale}`;

                // 調用剪貼簿 API
                navigator.clipboard.writeText(etchingMaterial_data).then(() => {
                    // 選做：給使用者一點視覺回饋
                    alert('【蝕刻材質參數已複製】\n' + etchingMaterial_data);
                }).catch(err => {
                    console.error('複製失敗', err);
                });
            },

        copyMaterialData: function() //InstMaterial(thisColor,thisRoughness,thisMetalness,thisTransmission,thisIor,thisReflectivity,isTransparent,thisOpacity,isDepthWrite)
        {
            const material_data = `${FetchHexColor(material)},${material.roughness},${material.metalness},${material.transmission},${material.ior},${material.reflectivity},${material.transparent},${material.opacity},${material.depthWrite}`;

            // 調用剪貼簿 API
            navigator.clipboard.writeText(material_data).then(() => {
                // 選做：給使用者一點視覺回饋
                alert('【基礎材質參數已複製】\n' + material_data);
            }).catch(err => {
                console.error('複製失敗', err);
            });
        }
        };

        sub_gui.add( params, 'copyEtchingMaterialData' ).name('Copy Params for InstEtchingMaterial');
        sub_gui.add( params, 'copyMaterialData' ).name('Copy Params for InstMaterial');
    }
}

//材質球名稱搜尋Mesh
export function Material_Inspector_TypeB(thisScene) 
{
    const mainGui = new GUI();
    mainGui.title('材質檢查器B');

    // 🌟 用 Map 儲存不重複的材質，Key 是材質名稱(或UUID)，Value 是材質物件本身
    let material_map = new Map();

    // 1. 遍歷整個場景，搜集所有 Mesh 身上帶的材質球
    thisScene.traverse((child) => {
        if (child.isMesh && child.material) {
            // 如果一個 Mesh 套用多個材質(Material Array)，一併處理
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    if (mat.name && mat.name !== "") {
                        material_map.set(mat.name, mat);
                    }
                });
            } else {
                if (child.material.name && child.material.name !== "") {
                    material_map.set(child.material.name, child.material);
                }
            }
        }
    });

    // 將收集到的材質球名稱轉為陣列列表
    let material_name_list = Array.from(material_map.keys());

    // 防呆：如果場景內完全沒有命名的材質球，塞入一個預設提示
    if (material_name_list.length === 0) {
        console.warn("⚠️ 場景中未偵測到命名的材質球！");
        return;
    }

    // 當前被選中的材質物件變數，預設選取列表中第一個
    let currentMaterial = material_map.get(material_name_list[0]);
    let selectorItem = { currentName: material_name_list[0] };

    // 2. 建立主選擇下拉選單
    mainGui.add(selectorItem, 'currentName', material_name_list)
        .name('選擇材質球')
        .onChange(function (selectedName) {
            currentMaterial = material_map.get(selectedName);
            UpdateContent(); // 當材質切換時，刷新下方的屬性面板
        });

    // 輔助函式：轉換顏色格式
    function FetchHexColor(targetMaterial) {
        if (!targetMaterial.color) return '0xFFFFFF';
        const hex = targetMaterial.color.getHexString().toUpperCase();
        return '0x' + hex;
    }

    // 輔助函式：防呆安全轉換路徑
    function formatToRelativePath(src) {
        if (!src) return "";
        try {
            const url = new URL(src);
            return url.pathname; // 唯讀取相對路徑部分 (例如 /textures/carbon.png)
        } catch (e) {
            return src;
        }
    }

    let sub_gui;
    UpdateContent(); // 初始呼叫，生成第一個材質的面板

    // 3. 動態渲染與更新材質屬性面板
    function UpdateContent() {  
        if (sub_gui) {
            sub_gui.destroy(); // 清除上一個材質的面板
        }

        sub_gui = new GUI();
        sub_gui.domElement.style.top = '53px';
        sub_gui.title(`屬性調整: ${selectorItem.currentName}`);

        const basicGui = sub_gui.addFolder("基礎參數 (Basic)");

        // 顏色動態雙向綁定
        basicGui.addColor({ color: currentMaterial.color ? currentMaterial.color.getHex() : 0xffffff }, 'color')
            .name('顏色 (Color)')
            .onChange(v => {
                if (currentMaterial.color) currentMaterial.color.set(v);
            });

        // 數值安全性驗證與防呆綁定
        if (currentMaterial.roughness !== undefined) basicGui.add(currentMaterial, 'roughness', 0, 1).name('粗糙度 (Roughness)');
        if (currentMaterial.metalness !== undefined) basicGui.add(currentMaterial, 'metalness', 0, 1).name('金屬度 (Metalness)');
        if (currentMaterial.transmission !== undefined) basicGui.add(currentMaterial, 'transmission', 0, 1).name('穿透度 (Transmission)');
        if (currentMaterial.ior !== undefined) basicGui.add(currentMaterial, 'ior', 1, 2.4).name('折射率 (IOR)');
        if (currentMaterial.reflectivity !== undefined) basicGui.add(currentMaterial, 'reflectivity', 0, 1).name('反射率 (Reflectivity)');
        if (currentMaterial.transparent !== undefined) basicGui.add(currentMaterial, 'transparent').name('透明開啟 (Transparent)');
        if (currentMaterial.opacity !== undefined) basicGui.add(currentMaterial, 'opacity', 0, 1, 0.01).name('不透明度 (Opacity)');
        if (currentMaterial.depthWrite !== undefined) basicGui.add(currentMaterial, 'depthWrite').name('深度寫入 (DepthWrite)');

        // 貼圖參數區 (Map)
        if (currentMaterial.map && currentMaterial.map.image) {
            const map_texture = currentMaterial.map;
            const mapGui = sub_gui.addFolder("顏色貼圖 (Map Parameter)");
            mapGui.add(map_texture.repeat, "x", 0, 2000, 0.1).name("平鋪 X (Repeat)").onChange(() => map_texture.needsUpdate = true);
            mapGui.add(map_texture.repeat, "y", 0, 2000, 0.1).name("平鋪 Y (Repeat)").onChange(() => map_texture.needsUpdate = true);
            mapGui.add(map_texture.offset, "x", -1, 1, 0.01).name("偏移 X (Offset)").onChange(() => map_texture.needsUpdate = true);
            mapGui.add(map_texture.offset, "y", -1, 1, 0.01).name("偏移 Y (Offset)").onChange(() => map_texture.needsUpdate = true);
        }

        // 凹凸貼圖參數區 (BumpMap)
        if (currentMaterial.bumpMap && currentMaterial.bumpMap.image) {
            const bumpMap_texture = currentMaterial.bumpMap;
            const bumpMapGui = sub_gui.addFolder("凹凸貼圖 (BumpMap Parameter)");
            bumpMapGui.add(bumpMap_texture.repeat, "x", 0, 2000, 0.1).name("平鋪 X (Repeat)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(bumpMap_texture.repeat, "y", 0, 2000, 0.1).name("平鋪 Y (Repeat)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(bumpMap_texture.offset, "x", -1, 1, 0.01).name("偏移 X (Offset)").onChange(() => bumpMap_texture.needsUpdate = true);
            bumpMapGui.add(bumpMap_texture.offset, "y", -1, 1, 0.01).name("偏移 Y (Offset)").onChange(() => bumpMap_texture.needsUpdate = true);
            if (currentMaterial.bumpScale !== undefined) {
                bumpMapGui.add(currentMaterial, "bumpScale", -100, 100, 0.01).name("凹凸強度").onChange(() => bumpMap_texture.needsUpdate = true);
            }
        }

        // 4. 複製參數行為定義
        const params = {
            copyEtchingMaterialData: function() {
                // 讀取貼圖與凹凸圖數據，如果沒有則給予預設空值防呆
                const mapSrc = (currentMaterial.map && currentMaterial.map.image) ? formatToRelativePath(currentMaterial.map.image.src) : "";
                const mapRepX = currentMaterial.map ? currentMaterial.map.repeat.x : 1;
                const mapRepY = currentMaterial.map ? currentMaterial.map.repeat.y : 1;
                const mapOffX = currentMaterial.map ? currentMaterial.map.offset.x : 0;
                const mapOffY = currentMaterial.map ? currentMaterial.map.offset.y : 0;

                const bumpSrc = (currentMaterial.bumpMap && currentMaterial.bumpMap.image) ? formatToRelativePath(currentMaterial.bumpMap.image.src) : "";
                const bumpRepX = currentMaterial.bumpMap ? currentMaterial.bumpMap.repeat.x : 1;
                const bumpRepY = currentMaterial.bumpMap ? currentMaterial.bumpMap.repeat.y : 1;
                const bumpScale = currentMaterial.bumpScale !== undefined ? currentMaterial.bumpScale : 0;

                const etchingMaterial_data = `${FetchHexColor(currentMaterial)},${currentMaterial.roughness ?? 0},${currentMaterial.metalness ?? 0},${currentMaterial.reflectivity ?? 0.5},${currentMaterial.transparent ?? false},${currentMaterial.opacity ?? 1},"${mapSrc}",new THREE.Vector2(${mapRepX},${mapRepY}),new THREE.Vector2(${mapOffX},${mapOffY}),"${bumpSrc}",new THREE.Vector2(${bumpRepX},${bumpRepY}),${bumpScale}`;

                navigator.clipboard.writeText(etchingMaterial_data).then(() => {
                    alert('【蝕刻材質參數已複製】\n' + etchingMaterial_data);
                }).catch(err => { console.error('複製失敗', err); });
            },

            copyMaterialData: function() {
                const material_data = `${FetchHexColor(currentMaterial)},${currentMaterial.roughness ?? 0},${currentMaterial.metalness ?? 0},${currentMaterial.transmission ?? 0},${currentMaterial.ior ?? 1.5},${currentMaterial.reflectivity ?? 0.5},${currentMaterial.transparent ?? false},${currentMaterial.opacity ?? 1},${currentMaterial.depthWrite ?? true}`;

                navigator.clipboard.writeText(material_data).then(() => {
                    alert('【基礎材質參數已複製】\n' + material_data);
                }).catch(err => { console.error('複製失敗', err); });
            },

            copyMaterialName: function() 
            {
                 const material_name = selectorItem.currentName;

                // 調用剪貼簿 API
                navigator.clipboard.writeText(material_name).then(() => {
                console.log('材質球名稱已複製到剪貼簿:', material_name);

                // 選做：給使用者一點視覺回饋
                alert('材質球名稱已複製！\n' + material_name);
                    }).catch(err => {
                    console.error('複製失敗', err);
                });
            },
        };

        // 將按鈕加入面板底部
        sub_gui.add(params, 'copyEtchingMaterialData').name('複製 InstEtchingMaterial 參數');
        sub_gui.add(params, 'copyMaterialData').name('複製 InstMaterial 參數');
        sub_gui.add(params, 'copyMaterialName').name('複製材質球名稱');
    }
}

//利用名稱尋找目標材質球並替換
export function ReplaceMaterial(thisScene, targetMaterialName, newMaterial) 
{
    let replaceCount = 0;

    // 1. 安全防呆：確保傳入的新材質有被命名，方便未來追蹤
    if (newMaterial && !newMaterial.name) {
        newMaterial.name = `${targetMaterialName}_replaced`;
    }

    // 2. 遍歷整個場景，尋找正在使用目標材質的 Mesh
    thisScene.traverse((child) => {
        if (child.isMesh && child.material) {
            
            // 情況 A：Mesh 套用了多重材質陣列 (Material Array)
            if (Array.isArray(child.material)) {

                console.log(child.material);
                child.material.forEach((mat, index) => {

                    
                    if (mat.name === targetMaterialName) {
                        child.material[index] = newMaterial;
                        replaceCount++;
                    }
                });
            } 
            // 情況 B：Mesh 使用單一標準材質
            else {
                if (child.material.name === targetMaterialName) {
                    child.material = newMaterial;
                    replaceCount++;
                }
            }
        }
    });

    // 3. 回報替換結果
    if (replaceCount > 0) {
        console.log(`✅ [材質替換成功] 已將名為 "${targetMaterialName}" 的材質，成功替換為新材質 "${newMaterial.name}"，共影響 ${replaceCount} 個幾何表面。`);
        return true;
    } else {
        console.warn(`⚠️ [材質替換警告] 在場景中沒有找到任何使用 "${targetMaterialName}" 的物件，未進行任何替換。`);
        return false;
    }
}

//搭配Material_Inpector使用
const material_param = {
	color:0xff9900,
    roughness:0.1,
    metalness:0.9,
    map_offset_x:0,
    map_offset_y:0,
    map_repeat_x:0,
    map_repeat_y:0, 
    bumpMap_offset_x:0,
    bumpMap_offset_y:0,
    bumpMap_repeat_x:0,
    bumpMap_repeat_y:0,
    bumpMap_scale:1,
    transparent:false,
    alphahash:false,
    opacity:1
};

//切換WebGPU架構後失去準確性，棄用
export function WebGLInspector(thisContainer, thisRenderer)
{
    thisContainer.appendChild(stats.dom);

    let info = document.createElement("div");
    info.setAttribute("id", "webglInfoPanel");

    info.style.cssText = `position:absolute;top:6%;left:0%;z-index: 99;color: rgba(0, 225, 255, 1);font-family: "Roboto", sans-serif;font-size: 15px;`;
    thisContainer.appendChild(info);

    var drawCalls=thisRenderer.info.render.calls;

    stats.update();

    document.getElementById("webglInfoPanel").textContent=`Draw Calls: ${drawCalls}`;
}

export function ToThreeEulerAngle(degree)
{
    let eulerAngle=Math.PI/180*degree;
    return eulerAngle;
}

export function LoadHDRWithPMREM(hdr_src,thisScene,thisRenderer) 
{
    new HDRLoader()
        .load( hdr_src, function ( texture ) {
    
        texture.mapping = THREE.EquirectangularReflectionMapping;
 
        const pmrem = new THREE.PMREMGenerator(thisRenderer);
        const envMap = pmrem.fromEquirectangular(texture).texture;  
        thisScene.environment = envMap; // PBR 使用的環境光

        texture.dispose();
        pmrem.dispose();
    
    } );
}

export function LoadUltraHDRForWebGPU(hdr_src,thisScene) 
{
    new UltraHDRLoader()
        .load( hdr_src, function ( texture ) {

        texture.mapping = THREE.EquirectangularReflectionMapping;
        //scene.background = texture;
        thisScene.environment = texture;

    } );
}

export function LerpFloat(current,target,ratio)
{
	let value;

	if(ratio>1)
	{
		ratio=1;
	}

	if(ratio<0)
	{
		ratio=0;
	}

	value=current+(target-current)*ratio;

	return value;
}

export function isMobile()//偵測是否為行動裝置
{
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function ReturnModelCenter(target)
{
    let center= new THREE.Vector3();
    const box = new THREE.Box3();
    
    target.traverse((child) => {
        // 只計算有幾何體且可見的網格 (Mesh)
        if (child.isMesh && child.visible) {
            // 更新包圍盒
            child.geometry.computeBoundingBox();
    
            // 將該子物件的世界包圍盒合併
            const childBox = new THREE.Box3().copy(child.geometry.boundingBox);
            child.updateMatrixWorld(true);
            childBox.applyMatrix4(child.matrixWorld);
    
            box.union(childBox);
        }
    });
    
    // 現在顯示出來的 box 就會精準很多
    //const helper = new THREE.Box3Helper(Box, 0xffff00);
    //scene.add(helper);
    
    box.getCenter(center);

    return center;
}

export function ReturnModelSize(target)
{
    let size= new THREE.Vector3();
    const box = new THREE.Box3();
    
    target.traverse((child) => {
        // 只計算有幾何體且可見的網格 (Mesh)
        if (child.isMesh && child.visible) {
            // 更新包圍盒
            child.geometry.computeBoundingBox();
    
            // 將該子物件的世界包圍盒合併
            const childBox = new THREE.Box3().copy(child.geometry.boundingBox);
            child.updateMatrixWorld(true);
            childBox.applyMatrix4(child.matrixWorld);
    
            box.union(childBox);
        }
    });
    
    // 現在顯示出來的 box 就會精準很多
    //const helper = new THREE.Box3Helper(Box, 0xffff00);
    //scene.add(helper);
    
    box.getSize(size);

    return size;
}

export function SafeTraverse(root, callback) {
    if (!root) {
        console.warn("safeTraverse: root 物件不存在");
        return;
    }

    // 1. 檢查 children 是否合法，預防 traverse 內部報錯
    if (!Array.isArray(root.children)) {
        console.error("safeTraverse: 物件結構異常，children 屬性不合法", root);
        return;
    }

    // 2. 執行當前節點的回調 (加上 try-catch 確保單一節點出錯不影響全局)
    try {
        if (root) callback(root);
    } catch (e) {
        console.error(`執行節點 ${root.name || root.uuid} 的回調時出錯:`, e);
    }

    // 3. 關鍵：複製一份 children 陣列再進行遞迴
    // 這能防止在 callback 內部執行 remove() 或 add() 時導致原始索引偏移
    const childrenToTraverse = [...root.children];

    for (const child of childrenToTraverse) {
        // 4. 防禦性檢查：略過 children 陣列中的 undefined 或 null
        if (child) {
            SafeTraverse(child, callback);
        } else {
            console.warn(`在物件 ${root.name || 'unnamed'} 的子層中發現空節點，已自動略過。`);
        }
    }
}

function formatToRelativePath(fullUrl) 
{
    try {
        // 使用 URL 類別解析字串
        const urlObj = new URL(fullUrl);
        
        // urlObj.pathname 會得到 "/textures/Leather.png"
        // 我們去掉最前面的斜線，並加上 ./
        const relativePath = '.' + urlObj.pathname;
        
        return relativePath;
    } catch (e) {
        // 如果傳入的不是完整 URL（例如已經是相對路徑），則直接回傳原值
        return fullUrl;
    }
}

export const WaitForSeconds = (sec) => new Promise(resolve => setTimeout(resolve, sec*1000)); 

//使用範例(以秒為單位)
//async function test()
//{
//	num++;
//	_test_words.textContent = `${num}`;
//	await FX.WaitForSeconds(1);
//	test();
//}

export async function WaitUntilWithTimeout(conditionFn, timeout = 5, checkInterval = 0.01) // 每 10ms 檢查一次，避免佔用過多 CPU
{ 
    const startTime = Date.now();  
    // 只要條件不成立，就一直「等一下再檢查」 

    while (!conditionFn()) 
    {
        if (Date.now() - startTime > timeout*1000) 
        { 
            throw new Error("等待超時了！"); 
        } 

        await new Promise(r => setTimeout(r, checkInterval*1000)); 
    }
}

//使用範例(若要修改傳入參數，以秒為單位)
/*
let isDataLoaded=false;

async function test()
{
	_test_words.textContent = `開始`;
	await FX.WaitUntilWithTimeout(() => isDataLoaded === true); 
	_test_words.textContent = `結束`;
}

// 模擬 4.9 秒後資料載入完成
setTimeout(() => { isDataLoaded = true; }, 4900);

test();*/

// 範例：等待某個變數變成 true，設定超時為 10 秒，每 0.1秒 檢查一次
/*
await WaitUntilWithTimeout(
    () => window.someDataLoaded === true, 
    10, // 這是新的 timeout (10秒)
    0.1    // 這是新的 checkInterval (100ms)
);
*/

//影子工具
let shadowCamera, shadowGroup;
let renderTarget;
let plane, fillPlane, cameraHelper;
let depthMaterial, shadowPlaneMaterial, fillPlaneMaterial;

export let shadow_setting = {
    shadow: { blur: 1, darkness: 0.1, opacity: 1 },
    plane: { color: '#ffffff', opacity: 1 },
    showWireframe: false
};

let PLANE_WIDTH = 100;
let PLANE_HEIGHT = 100;
let CAMERA_HEIGHT = 50;//必須高於模型，否則看不到


//若要修改必須設定在InitWebGPUShadow之前
export function UpdateShadowSpcaceSize( ground_width, ground_height, camera_height)
{
    PLANE_WIDTH = ground_width;
    PLANE_HEIGHT = ground_height;
    CAMERA_HEIGHT = camera_height;
}

// 客製化方法
/* 
InitWebGPUShadow(scene, {
     shadow: { blur: 2.5, darkness: 0.05 },
     plane: { color: '#000000', opacity: 0.5 }
});

*/ 

export function InitWebGPUShadow(scene, customSetting = {}) 
{	

    // 【核心關鍵】將外部傳進來的自訂設定，融合/覆寫到預設的 shadow_setting 中
    if (customSetting.shadow) Object.assign(shadow_setting.shadow, customSetting.shadow);
    if (customSetting.plane) Object.assign(shadow_setting.plane, customSetting.plane);
    if (customSetting.hasOwnProperty('showWireframe')) shadow_setting.showWireframe = customSetting.showWireframe;

    shadowGroup = new THREE.Group();
    shadowGroup.position.y = 0;
    scene.add( shadowGroup );

    renderTarget = new THREE.RenderTarget( 512, 512, { depthBuffer: true } );
    renderTarget.texture.generateMipmaps = false;

    // 【核心關鍵】加入這兩行，讓貼圖放大時自動進行平滑漸層模糊，打碎網格
    renderTarget.texture.minFilter = THREE.LinearFilter;
    renderTarget.texture.magFilter = THREE.LinearFilter;

    const planeGeometry = new THREE.PlaneGeometry( PLANE_WIDTH, PLANE_HEIGHT ).rotateX( Math.PI / 2 );

    // 1. 深度材質（TSL 版本）
    depthMaterial = new THREE.NodeMaterial();
    const alphaDepth = float( 1 ).sub( depth ).mul( shadow_setting.shadow.darkness );
    depthMaterial.colorNode = vec3( 0 );
    depthMaterial.opacityNode = alphaDepth;
    depthMaterial.depthTest = false;
    depthMaterial.depthWrite = false;

    // 2. 模糊影子地板材質（TSL 版本）
    shadowPlaneMaterial = new THREE.NodeMaterial();
    shadowPlaneMaterial.transparent = true;
    shadowPlaneMaterial.depthWrite = false;

    // 完美發揮 WebGPU 原生高斯模糊
    const blurredShadow = gaussianBlur( texture( renderTarget.texture ), shadow_setting.shadow.blur, 8, { premultipliedAlpha: false } );
    shadowPlaneMaterial.colorNode = vec3( 0 );
    shadowPlaneMaterial.opacityNode = blurredShadow.a.mul( shadow_setting.shadow.opacity );

    plane = new THREE.Mesh( planeGeometry, shadowPlaneMaterial );
    plane.renderOrder = 1;
    plane.scale.y = - 1;
    plane.scale.z = - 1;
    shadowGroup.add( plane );

    // 3. 地板底色補色面
    fillPlaneMaterial = new THREE.NodeMaterial();
    fillPlaneMaterial.transparent = true;
    fillPlaneMaterial.depthWrite = false;
    fillPlaneMaterial.colorNode = new THREE.Color( shadow_setting.plane.color );
    fillPlaneMaterial.opacityNode = shadow_setting.plane.opacity;
    fillPlane = new THREE.Mesh( planeGeometry, fillPlaneMaterial );
    fillPlane.rotateX( Math.PI );
    shadowGroup.add( fillPlane );

    // 4. 正投影影子相機
    shadowCamera = new THREE.OrthographicCamera( - PLANE_WIDTH / 2, PLANE_WIDTH / 2, PLANE_HEIGHT / 2, - PLANE_HEIGHT / 2, 0, CAMERA_HEIGHT );
    shadowCamera.rotation.x = Math.PI / 2;
    shadowGroup.add( shadowCamera );
}


export function UpdateWebGPUShadow(renderer, scene, mainCamera) 
{
    // 【優化】後台錄製前，先隱藏影子地板與補色地板，避免自己拍到自己
    plane.visible = false;
    fillPlane.visible = false;
    
    const initialBackground = scene.background;
    scene.background = null;

    const prevOverride = scene.overrideMaterial;
    scene.overrideMaterial = depthMaterial;

    const initialAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    const initialClearAlpha = renderer.getClearAlpha ? renderer.getClearAlpha() : undefined;
    if ( initialClearAlpha !== undefined ) renderer.setClearAlpha( 0 );

    // 執行第一階段：渲染影子深度
    renderer.setRenderTarget( renderTarget );
    renderer.clear();
    renderer.render( scene, shadowCamera );

    scene.overrideMaterial = prevOverride;
    renderer.setRenderTarget( null );
    renderer.autoClear = initialAutoClear;
    if ( initialClearAlpha !== undefined ) renderer.setClearAlpha( initialClearAlpha );
    scene.background = initialBackground;

    plane.visible = true;
    fillPlane.visible = true;

    // 執行第二階段：正常渲染主畫面到螢幕上
    //renderer.render( scene, mainCamera || camera );
}

//USDZ生成工具
export async function USDZ_Exporter(scene)
{
    // 1. 定義你的 USDZ 檔案路徑與下載名稱
    const usdzUrl = '';
    const downloadName = 'asset.usdz';

    // 2. 在記憶體中動態建立 <a> 標籤
    const link = document.createElement('a');
    
    // 3. 設定與你 HTML 對應的屬性值
    link.id = 'link';
    link.setAttribute('rel', 'ar');         // 💡 喚起蘋果 AR 的靈魂屬性
    link.setAttribute('href', usdzUrl);      // 檔案路徑
    link.setAttribute('download', downloadName); // 提示瀏覽器下載時的檔名

    const params = 
    {
	    exportUSDZ: function() 
        {
            link.click();
        }
    };

    const exporter = new USDZExporter();
	const arraybuffer =  await exporter.parseAsync( scene );
	const blob = new Blob( [ arraybuffer ], { type: 'application/octet-stream' } );		
	link.href = URL.createObjectURL( blob );

	const gui = new GUI();

	gui.add( params, 'exportUSDZ' ).name( 'Export USDZ' );
	gui.open();
}


