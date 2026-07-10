import express from 'express';
import { PullRequestContoller } from '../../controller/pullRequest.controller';

const router = express.Router(); 

router.get("/allPrs", PullRequestContoller.findAll);
router.get("/prById/:id", PullRequestContoller.findById);
router.get("/createPr", PullRequestContoller.create);