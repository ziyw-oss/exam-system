// backend/server.js (纯 ESM)
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import graderRouter from "./routes/graderRouter.js";
import learnRoutes from "./routes/learn.js";
import progressRoutes from "./routes/progress.js";


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", graderRouter);
app.use("/api/learn", learnRoutes);
app.use("/api/progress", progressRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});