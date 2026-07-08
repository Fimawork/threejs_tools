import * as THREE from 'three';
import * as FX from './fx_functions.js';
import { ObjectLoader } from 'three';

import * as FXUI from 'https://cdn.jsdelivr.net/gh/Fimawork/threejs_tools@2.43/fx_hud.js';

let currentLoadedMesh = null; // 用來記錄當前載入的 3D 物件

//完整打包並透過 Pako.js 壓縮下載
export function Scene_Exporter(thisScene, thisProject) 
{
  FXUI.InstLoadingEffect_Type_B(true);
  console.log("正在打包場景物件...");

  setTimeout(() => {

    try {

      // 1.利用你原本寫好的防呆過濾，抓取乾淨的模型群組
      const modelPackage = GetOnlyModelFromScene(thisScene);

      // 2.執行 Three.js 原生的完整 toJSON（保留所有高精細頂點與貼圖格式）
      const resultJson = modelPackage.toJSON();

      // 3.先轉成普通 JSON 字串
      const jsonString = JSON.stringify(resultJson);

      console.log("正在進行 GZIP 串流壓縮...");

      // 利用 pako 壓縮超長字串，將其轉為二進位制數據流 (Uint8Array)
      // window.pako 對應 CDN 引入的變數，如果是 npm 則改用 import pako from 'pako'
      const pakoInstance = window.pako || pako; 

      if (!pakoInstance) {
          alert("未偵測到 pako.js 壓縮庫，請先在 HTML 引入 CDN！");
          return;
      }

      const compressedBuffer = pakoInstance.deflate(jsonString);
      
      // 4.將二進位數據包裝成 octet-stream 檔案（下載速度會快非常多）
      const blob = new Blob([compressedBuffer], { type: 'application/octet-stream' });
      
      // 5.格式化時間檔名
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      // 6.後綴加上 .gz 作為壓縮識別
      const fileName = `${year}${month}${date}_${hours}${minutes}${seconds}.${thisProject}.gz`;

      const tempLink = document.createElement('a');
      tempLink.href = URL.createObjectURL(blob);
      tempLink.download = fileName;
      tempLink.click();

      // 7.延遲釋放
      setTimeout(() => {
        URL.revokeObjectURL(tempLink.href);
        FXUI.InstLoadingEffect_Type_B(false);
      }, 100);

      console.log(`壓縮匯出成功！檔案已瘦身並下載：${fileName}`);

    } 

    catch (error) {
        console.error('匯出失敗:', error);
        alert('儲存配置時發生錯誤。');
    } 

  }, 50); // 延遲 50 毫秒，釋放主執行緒給瀏覽器渲染 UI
}

export function LoadScene(fileEvent, thisScene, thisCamera, thisControls, thisScale, isFrontSide) 
{
  const file = fileEvent.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  //因為檔案是壓縮的二進位制流，Reader 必須以 ArrayBuffer 格式讀取！
  reader.readAsArrayBuffer(file);

  // 當檔案讀取完成時觸發
  reader.onload = function (e) {
    try {
      console.log("正在進行二進位數據流解壓縮...");
      
      const pakoInstance = window.pako || pako;
      if (!pakoInstance) {
        throw new Error("找不到 pako.js 壓縮庫");
      }

      // 1.從 ArrayBuffer 讀取二進位數據
      const arrayBuffer = e.target.result;
      const byteArray = new Uint8Array(arrayBuffer);

      // 2.使用 pako.inflate 將二進位數據還原回「超長 JSON 字串」
      const decodedJsonString = pakoInstance.inflate(byteArray, { to: 'string' });

      // 3.將字串解析回 JSON 物件
      const jsonObject = JSON.parse(decodedJsonString);

      console.log("解壓完畢，正透過 ObjectLoader 還原 3D 實體...");
      const loader = new ObjectLoader();
      const loadedSceneOrMesh = loader.parse(jsonObject);

      // 4.移除舊模型
      if (currentLoadedMesh) {
        thisScene.remove(currentLoadedMesh);
      }

      // 5.將還原後的完整 3D 物件重新加入場景
      currentLoadedMesh = loadedSceneOrMesh;
      thisScene.add(currentLoadedMesh);

      // 6.自動調整鏡頭對焦
      FitCameraToModelHeight(thisCamera, currentLoadedMesh, thisControls, thisScale, isFrontSide);

      console.log('壓縮檔解析還原成功，模型已渲染！');

    } catch (error) {
      console.error('File parsing failed:', error);
      alert('無法解壓縮或解析此檔案。請確保此檔案是用 GZIP (Pako) 匯出的格式。');
    }
  };
}

// 鏡頭自動對焦高度輔助函式
function FitCameraToModelHeight(camera, object, controls = null, scale, frontSide) 
{
  let center = FX.ReturnModelCenter(object);
  let size = FX.ReturnModelSize(object);

  //同步 scale 設定
  center = new THREE.Vector3(center.x * scale, center.y * scale, center.z * scale);
  size = new THREE.Vector3(size.x * scale, size.y * scale, size.z * scale);

  const modelHeight = size.y;
  const vFov = camera.fov * (Math.PI / 180); 
  
  let cameraZ = (modelHeight / 2) / Math.tan(vFov / 2) * 2;
  const minDistance = 5;
  if (cameraZ < minDistance) cameraZ = minDistance;

  let t = frontSide ? 1 : -1;
  camera.position.set(
    t * center.x, 
    center.y + (modelHeight * 0.2), 
    t * (center.z + cameraZ)
  );
  
  camera.lookAt(center);

  if (controls) {
    controls.target.set(center.x, center.y, center.z);
    controls.update();
  }
}

//從場景中安全分離實體模型，並使用 Clone 避免破壞原場景
export function GetOnlyModelFromScene(thisScene) 
{
  const sceneModelGroup = new THREE.Group();
  sceneModelGroup.name = "exported_model_package";

  const targetsToMove = [];

  for (let i = 0; i < thisScene.children.length; i++) {
    const child = thisScene.children[i];
    // 排除燈光、相機與輔助線，確保只打包實體
    if (child.isObject3D && !child.isLight && !child.isCamera && !child.isHelper && child.name !== "exported_model_package") {
      targetsToMove.push(child);
    }
  }

  // 使用 .clone() 複製分身，這樣匯出時網頁主畫面上的輪子才不會消失或結構移位
  targetsToMove.forEach((child) => {
    sceneModelGroup.add(child.clone());
  });

  return sceneModelGroup;
}

