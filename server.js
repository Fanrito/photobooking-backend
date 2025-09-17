// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import exhibitionsRouter from "./routes/exhibitions.js";
import bookingsRouter from "./routes/bookings.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());

// 路由
app.use("/api/exhibitions", exhibitionsRouter);
app.use("/api/bookings", bookingsRouter);

// 健康检查
app.get("/", (req, res) => res.send("场照预约系统后端 OK"));

// 启动
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
