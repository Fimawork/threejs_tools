const { exec } = require("child_process");
const chokidar=require("chokidar");
const fs=require("fs");
const path=require("path");
const { stdout, stderr } = require("process");

const DRACOGLB_DIR="D:/fima/Works/fimawork/project/FW_0002/ArtAssets/models"; 
const BAT_FILE="D:/fima/Works/fimawork/project/FW_0002/ArtAssets/sliceModels.bat";
const SOURCE_DIR="D:/fima/Works/fimawork/project/FW_0002/ArtAssets/base64";  
const TARGET_DIR="D:/fima/Works/fimawork/project/FW_0002/FW_0002_Rollsys/models";



if(!fs.existsSync(TARGET_DIR))
{
    fs.mkdirSync(TARGET_DIR,{recursive:true});
}

const watch_dracoglb= chokidar.watch(DRACOGLB_DIR,{
    persistent:true,
    ignoreInitial:true
});

watch_dracoglb.on("all",(event,filePath) => {
   console.log(`[圖面異動] 事件: ${event}, 檔案: ${path.basename(filePath)}`);
    
    // 防抖處理：等待 500ms 內沒有新異動才執行，避免連續觸發
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        runBat();
    }, 500);
});

let isRunning = false;
let debounceTimer = null;

function runBat()
{
    if (isRunning) {
        console.log("⏳ BAT 正在執行中，跳過本次觸發...");
        return;
    }

    isRunning = true; // 標記為執行中
    console.log("開始執行 BAT 腳本...");

    exec(`"${BAT_FILE}"`, (error, stdout, stderr) => {
        isRunning = false; // 執行完畢，恢復狀態

        if (error) {
            console.error("BAT 執行出錯:", error.message);
            return;
        }

        if (stdout) console.log("--- BAT 輸出 ---\n", stdout);
        if (stderr) console.warn("--- BAT 警告 ---\n", stderr);
        
        console.log("BAT 執行完畢。");
    });
}

const watcher_base64 = chokidar.watch(SOURCE_DIR,{
    persistent:true,
    ignoreInitial:true,
    ignored: (filePath) => {
        // 如果是資料夾則不忽略(為了進入子目錄)，如果是檔案則只留 .js
        if (fs.lstatSync(filePath).isDirectory()) return false;
        return !filePath.endsWith(".js");
    }
});

watcher_base64.on("add",(filePath) => copyFile(filePath));
watcher_base64.on("change",(filePath) => copyFile(filePath));

function copyFile(filePath) {
    try {
        const relativePath = path.relative(SOURCE_DIR, filePath);
        const targetPath = path.join(TARGET_DIR, relativePath);

        // 確保子目錄存在
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        fs.copyFileSync(filePath, targetPath); // 改用 Sync 版本更直觀
        console.log("已同步:", relativePath);
    } catch (err) {
        console.error("複製失敗:", filePath, err.message);
    }
}

console.log("監聽啟動中...");
console.log("來源:", SOURCE_DIR);
console.log("目標:", TARGET_DIR);

// 報錯處理
watcher_base64.on("error", error => console.error(`監控出錯: ${error}`));