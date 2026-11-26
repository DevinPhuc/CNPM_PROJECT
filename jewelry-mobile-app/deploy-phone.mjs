import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adbPath = "C:\\Program Files (x86)\\Android\\android-sdk\\platform-tools\\adb.exe";
const apkPath = path.join(__dirname, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const androidDir = path.join(__dirname, "android");

console.log("\n==============================================");
console.log("🚀 [SaiGon Jewelry] Bắt đầu triển khai lên điện thoại...");
console.log("==============================================\n");

// 1. Đồng bộ bundle web
console.log("📦 1. Đang build giao diện web & đồng bộ vào Android assets...");
execSync("npm run build", { cwd: __dirname, stdio: "inherit" });

// 2. Build APK với gradlew
console.log("\n🔨 2. Đang biên dịch APK Android (gradlew assembleDebug)...");
const gradlewCmd = process.platform === "win32" ? ".\\gradlew.bat assembleDebug" : "./gradlew assembleDebug";
execSync(gradlewCmd, { cwd: androidDir, stdio: "inherit" });

if (!fs.existsSync(apkPath)) {
  console.error("❌ Không tìm thấy file APK sau khi build tại:", apkPath);
  process.exit(1);
}
console.log("✅ Đã tạo file APK thành công:", apkPath);

// 3. Kiểm tra thiết bị ADB
console.log("\n📱 3. Kiểm tra thiết bị kết nối qua cáp USB...");
const devicesOutput = execSync(`"${adbPath}" devices`, { encoding: "utf8" });
console.log(devicesOutput.trim());

if (devicesOutput.includes("unauthorized")) {
  console.error("\n❌ LỖI: Điện thoại đang ở trạng thái 'unauthorized'!");
  console.error("👉 Vui lòng mở khóa điện thoại và bấm 'Cho phép' / 'Allow' trên màn hình điện thoại.");
  process.exit(1);
}

const lines = devicesOutput.split("\n").filter(l => l.trim() && !l.includes("List of devices"));
if (lines.length === 0) {
  console.error("\n❌ LỖI: Không tìm thấy điện thoại nào kết nối qua cáp USB!");
  console.error("👉 Vui lòng cắm lại cáp USB và bật chế độ 'Gỡ lỗi USB' (USB Debugging).");
  process.exit(1);
}

// 4. Cài đặt APK
console.log("\n📲 4. Đang nạp và cài đặt APK lên điện thoại...");
execSync(`"${adbPath}" install -r "${apkPath}"`, { stdio: "inherit" });

// 5. Khởi chạy App
console.log("\n✨ 5. Đang mở ứng dụng SaiGon Jewelry trên điện thoại...");
try {
  execSync(`"${adbPath}" shell monkey -p com.huongjewelry.app -c android.intent.category.LAUNCHER 1`, { stdio: "inherit" });
} catch (e) {
  execSync(`"${adbPath}" shell am start -n com.huongjewelry.app/.MainActivity`, { stdio: "inherit" });
}

console.log("\n==============================================");
console.log("🎉 THÀNH CÔNG: Ứng dụng SaiGon Jewelry đã xuất hiện trên màn hình điện thoại!");
console.log("==============================================\n");
