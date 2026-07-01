import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleStripeWebhook } from "./routes/stripe";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());

// Serve uploaded media files without auth — needed for overlay iframes
const mediaDir = path.join(process.cwd(), "data", "media");
app.use("/api/media/files", express.static(mediaDir));

// Stripe webhook MUST be registered before express.json() — needs raw body
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Seed DB defaults on startup (non-blocking)
import("./lib/plans-store").then(({ seedDefaultPlans }) => seedDefaultPlans()).catch((err) => {
  logger.error({ err }, "Failed to seed default plans");
});

export default app;
