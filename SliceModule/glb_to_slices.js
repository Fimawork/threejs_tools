// glb_to_slices.js
// Usage: node glb_to_slices.js model.glb output_folder

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputFolder = process.argv[3] || "."; // 如果沒有指定，預設當前資料夾

if (!inputPath) {
    console.error("請輸入 GLB 檔案，例如： node glb_to_slices.js model.glb output_folder");
    process.exit(1);
}

// 確保輸出資料夾存在
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

const fileName = path.basename(inputPath, path.extname(inputPath));

// 你可以改這個值（10000 = 每段一萬字元）
const SLICE_SIZE = 10000;

// 讀取 GLB
const glbBuffer = fs.readFileSync(inputPath);

// 轉 Base64
const base64 = glbBuffer.toString('base64');

// 輸出完整 Base64
fs.writeFileSync(path.join(outputFolder,`${fileName}_base64.txt`), base64);

// 自動切片
const slices = [];
for (let i = 0; i < base64.length; i += SLICE_SIZE) {
    slices.push(base64.slice(i, i + SLICE_SIZE));
}

// 輸出切片到 TXT
fs.writeFileSync(path.join(outputFolder,`${fileName}_slices.txt`), slices.join("\n"));

// 輸出 JS 版本
let jsOutput = "export const base64Slices = [\n";
slices.forEach(s => {
    jsOutput += `  "${s}",\n`;
});
jsOutput += "];\n";
jsOutput += `
export function ${fileName}() {
    return base64Slices.join("");
}
`;
fs.writeFileSync(path.join(outputFolder,`${fileName}_slices.js`), jsOutput);

console.log("✔ 轉換完成！");
console.log(`輸出資料夾：${outputFolder}`);
console.log(`- ${fileName}_base64.txt`);
console.log(`- ${fileName}_slices.txt`);
console.log(`- ${fileName}_slices.js`);