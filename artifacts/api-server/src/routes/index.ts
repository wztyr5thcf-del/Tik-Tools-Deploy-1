import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tiktokRouter from "./tiktok";
import configRouter from "./config";
import authRouter from "./auth";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(tiktokRouter);
router.use(configRouter);
router.use(stripeRouter);

export default router;
