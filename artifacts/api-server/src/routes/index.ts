import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tiktokRouter from "./tiktok";
import configRouter from "./config";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import adminToolsRouter from "./admin-tools";
import rolesRouter from "./roles";
import plansRouter from "./plans";
import uiConfigRouter from "./ui-config";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(tiktokRouter);
router.use(configRouter);
router.use(stripeRouter);
router.use(adminToolsRouter);
router.use(rolesRouter);
router.use(plansRouter);
router.use(uiConfigRouter);

export default router;
