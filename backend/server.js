const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cron = require("node-cron"); // Gom các require thư viện lên đầu

const routeV1 = require("./src/routes");
const corsConfig = require("./src/config/cors");
const notFound = require("./src/middleware/notFound");
const errorHandler = require("./src/middleware/errorHandler");
const userService = require("./src/modules/user/user.service");
const iotService = require("./src/modules/iot/iot.service");
// CẢNH BÁO: Đảm bảo đường dẫn này trỏ đúng file cấu hình database của bạn!
const { getPool } = require("./db"); 

const app = express();

// Đưa express.json() lên TRƯỚC logger để có thể đọc được req.body
app.use(express.json());

app.use((req, res, next) => {
  console.log("---- REQUEST ----");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body); // Bây giờ body sẽ in ra dữ liệu chuẩn xác
  console.log("-----------------");
  next();
});

app.use(cors(corsConfig));

const PORT = Number(process.env.PORT) || 5001;
app.use("/api", routeV1);
app.use("/api/v1", routeV1);
app.use(notFound);
app.use(errorHandler);

// Hàm chạy định kỳ kiểm tra lịch
function startScheduleWorker() {
  cron.schedule('* * * * *', async () => {
    try {
      await iotService.executeScheduleRules();
      // console.log(`[${new Date().toISOString()}] Đã kiểm tra và áp dụng lịch tự động.`);
    } catch (error) {
      console.error("Lỗi khi chạy cron job cập nhật lịch thiết bị:", error);
    }
  });
}

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  try {
    await userService.ensureInitialAuthData();
    console.log("Initial auth data ensured (roles + admin user).");
    
    // Khởi động cron job SAU KHI server và DB đã sẵn sàng
    startScheduleWorker();
    console.log("Cron job for device schedules has been started.");
  } catch (error) {
    console.error("Failed to ensure initial auth data:", error.message);
  }
});