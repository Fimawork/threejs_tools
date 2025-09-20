import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export let targetPosition=null;

export let CameraDefaultPos, ControlsTargetDefaultPos;

///建議設置默認位置 posData[0]={ camera_pos:CameraDefaultPos, controlsTarget_pos:ControlsTargetDefaultPos};
///可自行擴充點位，EX:posData[1]={ camera_pos:new THREE.Vector3(267.359,339.340,302.847), controlsTarget_pos:new THREE.Vector3(-22.364,-14.285,25.345)};
export let posData=[]=[{ camera_pos:new THREE.Vector3(0, 5, 5), controlsTarget_pos:new THREE.Vector3(0, 0, 0)}];




//let camera_position=[{ camera_pos: new THREE.Vector3(0, 0, 0), controlsTarget_pos: new THREE.Vector3(0, 0, 0) }];
const camera_controls_params = {
	camera_x:0,
	camera_y:0,
	camera_z:0,
	controlsTarget_x:0,
	controlsTarget_y:0,
	controlsTarget_z:0
};

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
        
    } );
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
    const gui = new GUI();
    const CameraTransform = gui.addFolder( 'Camera Position' );

    CameraTransform.add( camera_controls_params, 'camera_x').listen();

    CameraTransform.add( camera_controls_params, 'camera_y').listen();

    CameraTransform.add( camera_controls_params, 'camera_z').listen();

    const ControlsTransform = gui.addFolder( 'ControlsTarget Position' );

    ControlsTransform.add( camera_controls_params, 'controlsTarget_x').listen();

    ControlsTransform.add( camera_controls_params, 'controlsTarget_y').listen();

    ControlsTransform.add(camera_controls_params, 'controlsTarget_z').listen();


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

export function MarqueeModule(thisMarqueeList,thisMargueeContainer, rollingSpeed)
{
    let MarqueeContent="";

    for(let j=0;j<thisMarqueeList.length;j++)
    {
        //list_length+=thisMarqueeList[j].offsetWidth;
        //InstMarquee(thisMargueeContainer,thisMarqueeList[j], rollingSpeed);
        MarqueeContent+=thisMarqueeList[j]+"            ";
    }

    //for(let i=0;i<2;i++)
    //{
        InstMarquee(thisMargueeContainer, MarqueeContent, rollingSpeed);
    //}
    
    //setTimeout(() => {InstMarquee(thisMargueeContainer, MarqueeContent, rollingSpeed);}, 12500);//1000=1sec}
 
}

function InstMarquee(thisContainer,thisMargueeText, speed) 
{
    let MargueeText = document.createElement("div");
    MargueeText.setAttribute("class", "marquee_text");
    MargueeText.textContent=thisMargueeText;
    thisContainer.appendChild( MargueeText );

    let offset = 0;

    MarqueeAnimation();

    function MarqueeAnimation()
    {
        requestAnimationFrame(MarqueeAnimation);

        const ParentRect = thisContainer.getBoundingClientRect();
		const childRect = MargueeText.getBoundingClientRect();
		const relativeright = childRect.right - ParentRect.right;

        offset  -= speed ;

        MargueeText.style.transform = `translateX(${offset}px)`;


        if (relativeright<-MargueeText.offsetWidth*0.5)
        {
            //thisContainer.appendChild(MargueeText);//變更為最後的子物件
            offset=MargueeText.offsetWidth*0.5;
        }
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


//export { UpdateCameraRotation, SceneTag};
