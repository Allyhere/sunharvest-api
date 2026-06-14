import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import farmRoutes from "./routes/farms";
import alertRoutes from "./routes/alerts";

const app = express();

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/farms", farmRoutes);
app.use("/api/v1", alertRoutes);

export default app;
