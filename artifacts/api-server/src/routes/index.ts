import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tiktokRouter from "./tiktok";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tiktokRouter);
router.use(configRouter);

export default router;
