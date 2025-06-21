import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FBXLoader.js';
import { TIFFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/TIFFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/lil-gui.module.min.js';

export let targetPosition=null;

export let CameraDefaultPos, ControlsTargetDefaultPos;




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
    switch (i)
    {
        case 0:
            targetPosition={camera_pos:CameraDefaultPos,controlsTarget_pos:ControlsTargetDefaultPos};
        break;

        case 1://scenario_01
            targetPosition={camera_pos:new THREE.Vector3(267.359,339.340,302.847),controlsTarget_pos:new THREE.Vector3(-22.364,-14.285,25.345)};
        break;

        case 2://scenario_02
            targetPosition={camera_pos:new THREE.Vector3(43.025,213.375,24.418),controlsTarget_pos:new THREE.Vector3(-25.722,96.421,-111.355)};
        break;

        case 3://scenario_03
            targetPosition={camera_pos:new THREE.Vector3(-110.130,100.762,207.078),controlsTarget_pos:new THREE.Vector3(-142.488,-40.777,112.939)};
        break;


    }
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

export function InstCurveLineMesh(target_A,target_B,thisMaterial,thisScale,thisHeight,thisName,thisParent,thisScene,thisTrafficDirectionForward) 
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

    const geometry = new THREE.SphereGeometry( 3, 32, 16 ); 
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const ball = new THREE.Mesh( geometry, material );
    let step=0;
    

    if(thisTrafficDirectionForward!=null)
    {
        
        thisScene.add( ball );

        

        if(thisTrafficDirectionForward)
        {
            step=0;
        }

        else
        {
            step=1;
        }
    }
    
    //thisScene.add(thisLineMesh);

    if(thisParent!=null)
    {
        thisParent.add(thisLineMesh)
    }
    
    else
    {
        thisScene.add( thisLineMesh );
       
    }

    


    TrafficAnim();
    
        function TrafficAnim()
        {
            requestAnimationFrame(TrafficAnim);
    
            //console.log(point_pos[current_pos]);
            
            ball.position.copy(destinations.getPoint(step));
            
            //console.log(ball.position);
            if(thisTrafficDirectionForward!=null)
            {
                if(thisTrafficDirectionForward)
                {
                    if(step<1)
                    {
                        step+=0.025;
                    }
                
                    if(step>1)
                    {
                        step=0;
                    }
                }
           
                else
                {
                    if(step>0)
                    {
                        step-=0.025;
                    }

                    if(step<0)
                    {
                        step=1;
                    }
                }
            }
            
        
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




//export { UpdateCameraRotation, SceneTag};
