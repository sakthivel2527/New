const express = require("express");
const router = express.Router();
const userContoller = require("../controllers/users");
router.get(["/", "/login"], (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  const user_id = req.query.user_id;
  res.render('register', { user_id });
 // res.render("register");
});

router.get("/profile", userContoller.isLoggedIn, (req, res) => {
  if (req.user) {
    res.render("profile", { user: req.user });
  } else {
    res.redirect("/login");
  }
});
router.get("/home", userContoller.isLoggedIn, userContoller.getUserList, (req, res) => {
  const user_id = req.query.user_id;
  console.log(user_id+"@@");
  if (req.user) {
    userContoller.getUserList;
    res.render("index", { user_id });
  } else {
    res.render("index");
  }
});

router.get("/registerone", userContoller.isLoggedIn, (req, res) => {
  const user_id = req.query.user_id;
  res.render('registerone', { user_id });
});

router.get("/upload", userContoller.isLoggedIn, (req, res) => {
  const user_id = req.query.user_id;
  res.render('upload', { user_id });
});

router.get("/uploadfam", userContoller.isLoggedIn, (req, res) => {
  const user_id = req.query.user_id;
  res.render('uploadfam', { user_id });
});

router.get("/uploadastro", userContoller.isLoggedIn, (req, res) => {
  const user_id = req.query.user_id;
  res.render('uploadastro', { user_id });
});

router.get("/popup", userContoller.isLoggedIn, userContoller.getUserDetails, (req, res) => {
  const user_id = req.query.user_id;
  console.log(user_id+"<--------------userid");
  res.render('popup', { user_id });
});

router.get("/otpverification", (req, res) => {
  const email = req.query.email;
  res.render('otp', { email });
});

router.get("/logout", (req, res) => {
  const user_id = req.query.user_id;
  res.render('login');
});


module.exports = router;