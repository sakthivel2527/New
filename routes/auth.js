const express = require("express");
const userController = require("../controllers/users");
const router = express.Router();

router.post("/home", userController.slider);
router.post("/otpverification", userController.otpverification);
router.post("/upload", userController.uploadimage);
router.post("/uploadfam", userController.uploadfamimage);
router.post("/uploadastro", userController.uploadastro);
router.post("/registation2", userController.registationtwo);
router.post("/registation1", userController.registationone);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", userController.logout);
module.exports = router;