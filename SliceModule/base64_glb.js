const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const inputDir = "./models/";
const outputDir = "./base64";

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

fs.readdirSync(inputDir)
.filter(f => f.endsWith(".glb"))
.forEach(file => {
    const name = path.basename(file, ".glb");
    const cmd = `node glb_to_slices.js "${path.join(inputDir, file)}" "${outputDir}"`;
    console.log(`處理 ${file} ...`);

    exec(cmd, (err, stdout, stderr) => {
        if (err) console.error(` 錯誤處理 ${file}:`, err);
        else console.log(`完成 ${file}`);
    });
});