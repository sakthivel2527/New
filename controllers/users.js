const db = require("./mysql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const body_parser = require('body-parser');
const { promisify } = require("util");
const multer = require('multer');
const path = require("path");
const { log } = require("console");
const exphbs = require('express-handlebars'); // updated to 6.0.X
const fileUpload = require('express-fileupload');
const nodemailer = require('nodemailer');

exports.login = async (req, res) => {
  try {
    const { phonenumber, password } = req.body;
    if (!phonenumber || !password) {
      return res.status(400).render("login", {
        msg: "Please Enter Your Email and Password",
        msg_type: "error",
      });
    }

    db.query(
      "select * from mat_users where phonenumber=?",
      [phonenumber],
      async (error, result) => {
        console.log(result.length);
        if (result.length <= 0) {
          return res.status(401).render("login", {
            msg: "Please Enter Your Valid PhoneNumber and Password",
            msg_type: "error",
          });
        } else {
          console.log((await bcrypt.compare(password, result[0].password)));
          if (!(await bcrypt.compare(password, result[0].password))) {
            return res.status(401).render("login", {
              msg: "PhoneNumber Or Password Incorrect...",
              msg_type: "error",
            });
            //     console.log(msg + '!!!!!!!');
          } else {
            const id = result[0].phonenumber;
            const payLoad = { phonenumber: result[0].phonenumber, email: result[0].email };
            //         console.log(id + "!!!!!!!!!!!!!!!!!!!!<==========jwt");
            const expiresInHours = process.env.JWT_EXPIRES_IN; // Set the expiration time in hours
            const token = jwt.sign(payLoad, process.env.JWT_SECRET, {
              expiresIn: expiresInHours * 60 * 60, // Convert hours to seconds
            });
            console.log("The Token is " + token);
            const cookieOptions = {
              expires: new Date(Date.now() + expiresInHours * 60 * 60 * 1000), // Convert hours to milliseconds
              httpOnly: true,
            };
            db.query(
              "INSERT INTO users_loggedIn SET login_date = now(), ?",
              {
                user_id: result[0].id,
                email: result[0].email,
                username: result[0].username,
                phonenumber: result[0].phonenumber,
                token: token,
                status: 'Active'
              },
              (error, result) => {
                if (error) {
                  console.log(error);
                } else {
                  console.log(result);
                }
              }
            );
            res.cookie("vel", token, cookieOptions);
            var user_id = result[0].id;
            console.log(result[0].Reg_status + "---" + user_id);
            if (result[0].Reg_status == '0') {
              res.status(200).redirect(`/register?user_id=${user_id}`);
            } else if (result[0].Reg_status == '1') {
              res.status(200).redirect(`/registerone?user_id=${user_id}`);
            } else if (result[0].Reg_status == '2') {
              res.status(200).redirect(`/upload?user_id=${user_id}`);
            } else if (result[0].Reg_status == '3') {
              res.status(200).redirect(`/uploadfam?user_id=${user_id}`);
            } else if (result[0].Reg_status == '4') {
              res.status(200).redirect(`/uploadastro?user_id=${user_id}`);
            } else if (result[0].Reg_status == '5') {
              res.status(200).redirect(`/home?user_id=${user_id}`);
            }
            //  res.status(200).redirect(`/uploadastro?user_id=${user_id}`);
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};

exports.isLoggedIn = async (req, res, next) => {
  // console.log(req.cookies.vel);
  if (req.cookies.vel) {
    try {
      const decode = await promisify(jwt.verify)(
        req.cookies.vel,
        process.env.JWT_SECRET
      );
      db.query(
        "SELECT * FROM users_loggedIn where phonenumber=? and email=? and token=?", [decode.phonenumber, decode.email, req.cookies.vel],
        (err, rows) => {
          if (err) {
            console.log(err);
            res.status(200).redirect("/");
          } else {
            if (rows[0].status === 'Active') {
              return next();
            } else {
              res.status(200).redirect("/");
              //      res.send("Access Denied");
            }
          }

        }
      );
    } catch (error) {
      console.log(error);
      // return next();
    }
  } else {
    res.send("Access Denied");
  }
};

exports.logout = async (req, res) => {
  res.cookie("vel", "logout", {
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true,
  });
  db.query(
    "SELECT * FROM mat_users WHERE id = ?",
    [req.query.user_id],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(200).redirect("/");
      }
      if (result.length > 0) {
        db.query(
          "UPDATE users_loggedIn SET logout_date = NOW(), status = 'InActive' WHERE user_id = ? AND id = (SELECT max_id FROM (SELECT MAX(id) AS max_id FROM users_loggedIn) AS subquery)",
          [req.query.user_id],
          (error, results) => {
            if (error) {
              res.status(200).redirect("/");
              return res.status(500).send("An error occurred"); // Send an error response and return
            }
            return res.redirect("/"); // Redirect after the query execution and return
          }
        );
        //    res.redirect("/");
      }
      //  res.status(200).redirect("/");
    }
  );
  // res.status(200).redirect("/");
};



exports.register = async (req, res) => {
  console.log(req.body);
  const { username, email, phonenumber, password, comfirmpassword } = req.body;
  db.query(
    "SELECT email FROM mat_users WHERE email = ?",
    [email],
    async (error, result) => {
      if (error) {
        console.log(error);
        res.status(200).redirect("/");
      } else {
        db.query(
          "SELECT phonenumber FROM mat_users WHERE phonenumber = ?",
          [phonenumber],
          async (error, rows) => {
            if (error) {
              console.log(error);
              res.status(200).redirect("/");
            } else {
              if (rows.length > 0) {
                return res.render("login", {
                  msg: "Phone number already taken",
                  msg_type: "error",
                });
              }

              if (result.length > 0) {
                return res.render("login", {
                  msg: "Email id already taken",
                  msg_type: "error",
                });
              } else if (password !== comfirmpassword) {
                return res.render("login", {
                  msg: "Passwords do not match",
                  msg_type: "error",
                });
              }

              let hashedPassword = await bcrypt.hash(password, 8);
              console.log(hashedPassword);

              function generateOTP() {
                const otpLength = 4; // Length of the OTP
                const otp = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit OTP
                console.log(otp);
                return otp.toString();
              }

              const transporter = nodemailer.createTransport({
                service: 'gmail',
                secure: false, // Set to true if using a secure connection (e.g., SMTP over SSL/TLS)
                auth: {
                  user: process.env.MAIL_ID,
                  pass: process.env.MAIL_ID_PW
                },
                debug: true
              });
              var otp = generateOTP();

              //  Define the email options
              const mailOptions = {
                from: process.env.MAIL_ID,
                to: email,
                subject: 'Matrimony Application',
                html: '<h1>OTP Verification</h1><p>Dear [User],</p><p>Thank you for registering with our Matrimony Application. To complete the verification process, please use the following OTP (One-Time Password):</p><h2>OTP:' + otp + '</h2><p>Please enter this OTP in the designated field on the registration page to verify your email address.</p><p>If you did not initiate this registration, please ignore this email.</p><br><p>Best regards,</p><p>Matrimony Application</p>',
              };
              //      await transporter.sendMail(mailOptions);
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log('Error occurred:', error);
                } else {
                  console.log('Email sent:', info.response);
                }
              });

              db.query(
                "INSERT INTO mat_users SET ?",
                {
                  username: username,
                  email: email,
                  phonenumber: phonenumber,
                  password: hashedPassword,
                  otp: otp,
                },
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(200).redirect("/");
                  } else {
                    //  var email_id = result[0].email;
                    res.status(200).redirect(`/otpverification?email=${email}`);
                  }
                }
              );
            }
          }
        );
      }
    }
  );
};


exports.registationone = async (req, res) => {
  console.log(req.body);
  const { id, fullname, dob, maritalstatus, gender, fathername, mothername, country, state, city, addresstype, resadd,
    workadd, mothertongue, nationality, religion, caste, subcaste, castedes, height, weight, bodytype, complexion, phystatus, email } = req.body;

  db.query(
    "SELECT * FROM mat_users WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(200).redirect("/");
      } else {
        console.log(results[0].id);
        const id = results[0].id;
        db.query(
          "INSERT INTO user_register SET ?",
          {
            id, fullname, dob, maritalstatus, gender, fathername, mothername, country, state, city, addresstype, resadd,
            workadd, mothertongue, nationality, religion, caste, subcaste, castedes, height, weight, bodytype, complexion, phystatus, email
          },
          (error, result) => {
            if (error) {
              console.log(error);
              res.status(200).redirect("/");
            } else {
              db.query(
                "UPDATE mat_users SET Reg_status = ? WHERE id = ?",
                [1, id],
                (error, result) => {
                  if (error) {
                    console.log(error);
                    //  res.status(200).redirect("/");
                  } else {
                    var user_id = req.body.id;
                    res.status(200).redirect(`/registerone?user_id=${user_id}`);
                  }
                }
              );
              // console.log(req.body.id);
              // var user_id = req.body.id;
              // res.status(200).redirect(`/registerone?user_id=${user_id}`);
            }
          }
        );
      }
    }
  );

};

exports.registationtwo = async (req, res) => {
  console.log(req.body);
  const { id, higeducation, emptype, income, companyname, designation, annualincome, star, rassi, dhosham, food, birthtime, familystatus,
    familytype, Parentsnum, Parentsnum2, parentsincome, description, sibilingsone, sibilingageone, sibilingtypeone, sibilingtwo, sibilingagetwo, sibilingtypetwo } = req.body;

  db.query(
    "SELECT * FROM mat_users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(200).redirect("/");
      } else {
        db.query(
          "UPDATE user_register SET higeducation = ?, emptype = ?, income = ?, companyname = ?, designation = ?, annualincome = ?, star = ?, rassi = ?, dhosham = ?, food = ?, birthtime = ?, familystatus = ?, familytype = ?, Parentsnum = ?, Parentsnum2 = ?, parentsincome = ?, description = ?, sibilingsone = ?, sibilingageone = ?, sibilingtypeone = ?, sibilingtwo = ?, sibilingagetwo = ?, sibilingtypetwo = ? WHERE id = ?",
          [
            higeducation, emptype, income, companyname, designation, annualincome, star, rassi, dhosham, food, birthtime, familystatus, familytype,
            Parentsnum, Parentsnum2, parentsincome, description, sibilingsone, sibilingageone, sibilingtypeone, sibilingtwo, sibilingagetwo,
            sibilingtypetwo, id
          ],
          (error, result) => {
            if (error) {
              console.log(error);
              res.status(200).redirect("/");
            } else {
              db.query(
                "UPDATE mat_users SET Reg_status = ? WHERE id = ?",
                [2, id],
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(200).redirect("/");
                  } else {
                    var user_id = req.body.id;
                    res.status(200).redirect(`/upload?user_id=${user_id}`);
                  }
                }
              );
            }
          }
        );

      }
    }
  );
};
var filename1;
var storage = multer.diskStorage({
  destination: 'public/imageuploads',
  filename: function (req, file, cb) {
    filename1 = file.originalname;
    cb(null, file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname))
  }
})

let maxSize = 5 * 1000 * 1000

let upload = multer({
  storage: storage,
  limits: {
    fileSize: maxSize
  },
  fileFilter: function (req, file, cb) {
    filename1 = file.originalname;
    let filetypes = /jpeg|jpg|png/;
    let mimetype = filetypes.test(file.mimetype);
    let extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    if (mimetype && extname) {
      db.query(
        "UPDATE user_register SET profileone = ? WHERE id = ?",
        [file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname), req.body.id],
        (error, result) => {
          if (error) {
            console.log(error);
          } else {
            db.query(
              "UPDATE mat_users SET Reg_status = ? WHERE id = ?",
              [3, req.body.id],
              (error, result) => {
                if (error) {
                  console.log(error);
                } else {
                  var user_id = req.body.id;
                }
              }
            );
          }
        }
      );
      return cb(null, true);

    }
    cb("Error: File upload only supports the following filetypes: " + filetypes)
  }
}).single('file');

exports.uploadimage = async (req, res, file) => {
  upload(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError && err.code == "LIMIT_FILE_SIZE") {
        return res.send("File size is maximum 2mb");
      }
      const upload = multer({
        storage: storage,
        limits: { fileSize: 10000000 }, // 10MB file size limit
        fileFilter: function (req, file, cb) {
          checkFileType(file, cb);
        }
      }).single('file');
      res.send(err);
    } else {
      var user_id = req.body.id;
      res.status(200).redirect(`/uploadfam?user_id=${user_id}`);
    }
  })
}

exports.slider = async (req, res) => {
  console.log("123");
}

exports.logincheck = async (req, res) => {
  console.log(req.body.id);
  db.query(
    "SELECT * FROM users_loggedIn where user_id = ? AND id = (SELECT max_id FROM (SELECT MAX(id) AS max_id FROM users_loggedIn) AS subquery) ",
    [req.body.id],
    (err, rows) => {
      if (err) {
        console.log(err);
        res.status(200).redirect("/");
      } else {
        return next();
      }

    }
  );
}


exports.getUserList = async (req, res) => {
  console.log("======>getUserList<======");
  db.query(
    "SELECT * FROM user_register",
    (err, rows) => {
      if (err) {
        console.log(err);
        return next();
      } else {
        var user_id = req.body.id;
        res.status(200).render('index', { userlist: rows, user_id: req.query.user_id });

      }

    }
  );
}

exports.getUserDetails = async (req, res) => {
  console.log("======>getUserDetails<=======");
  db.query(
    "SELECT * FROM user_register where id = ?", [req.query.user_id],
    (err, rows) => {
      if (err) {
        console.log(err);
        return next();
      } else {
        res.status(200).render('popup', { UserDetails: rows[0] });
      }

    }
  );
}


var filename1;
var storagefam = multer.diskStorage({
  destination: 'public/imageuploadsfamily',
  filename: function (req, file, cb) {
    filename1 = file.originalname;
    cb(null, file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname))
  }
})
let uploadfam = multer({
  storage: storagefam,
  limits: {
    fileSize: maxSize
  },
  fileFilter: function (req, file, cb) {
    filename1 = file.originalname;
    let filetypes = /jpeg|jpg|png/;
    let mimetype = filetypes.test(file.mimetype);
    let extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      console.log(file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname));
      db.query(
        "UPDATE user_register SET familyprofileone = ? WHERE id = ?",
        [file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname), req.body.id],
        (error, result) => {
          if (error) {
            console.log(error);
          } else {
            db.query(
              "UPDATE mat_users SET Reg_status = ? WHERE id = ?",
              [4, req.body.id],
              (error, result) => {
                if (error) {
                  console.log(error);
                } else {
                  var user_id = req.body.id;
                  //   res.status(200).redirect(`/upload?user_id=${user_id}`);
                }
              }
            );
          }
        }
      );
      return cb(null, true);

    }
    cb("Error: File upload only supports the following filetypes: " + filetypes)
  }
}).single('filefam');

exports.uploadfamimage = async (req, res, file) => {
  uploadfam(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError && err.code == "LIMIT_FILE_SIZE") {
        return res.send("File size is maximum 2mb");
      } const uploadfam = multer({
        storage: storagefam,
        limits: { fileSize: 10000000 }, // 10MB file size limit
        fileFilter: function (req, file, cb) {
          checkFileType(file, cb);
        }
      }).single('filefam');

      res.send(err);
    } else {
      var user_id = req.body.id;
      res.status(200).redirect(`/uploadastro?user_id=${user_id}`);
    }
  })
}



var filename1;
var storagefam = multer.diskStorage({
  destination: 'public/imageuploadsatro',
  filename: function (req, file, cb) {
    filename1 = file.originalname;
    cb(null, file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname))
  }
})
let uploadastro = multer({
  storage: storagefam,
  limits: {
    fileSize: maxSize
  },
  fileFilter: function (req, file, cb) {
    filename1 = file.originalname;
    let filetypes = /jpeg|jpg|png/;
    let mimetype = filetypes.test(file.mimetype);
    let extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      console.log(file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname));
      db.query(
        "UPDATE user_register SET horoscope = ? WHERE id = ?",
        [file.originalname.replace(/\.[^/.]+$/, "") + '_' + Date.now() + path.extname(file.originalname), req.body.id],
        (error, result) => {
          if (error) {
            console.log(error);
          } else {
            db.query(
              "UPDATE mat_users SET Reg_status = ? WHERE id = ?",
              [5, req.body.id],
              (error, result) => {
                if (error) {
                  console.log(error);
                } else {
                  var user_id = req.body.id;
                  //   res.status(200).redirect(`/upload?user_id=${user_id}`);
                }
              }
            );
          }
        }
      );
      return cb(null, true);
    }
    cb("Error: File upload only supports the following filetypes: " + filetypes)
  }
}).single('fileastro');


// Create a transporter
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   secure: false, // Set to true if using a secure connection (e.g., SMTP over SSL/TLS)
//   auth: {
//     user: '',
//  //   pass: 'ilwwjwfvhyfklpvp'
//   },
//   debug: true 
// });

// Define the email options
// const mailOptions = {
//   from: 'sakthivel27tvr@gmail.com',
//   to: 'sharmigokul123@gmail.com',
//   subject: 'Matrimony Application',
//   html: '<h1>Welcome to Matrimony Application</h1><p>Dear [User],</p><p>Congratulations on successfully registering with our Matrimony Application! We are delighted to have you as a member of our community.</p><p>Please feel free to explore the various features and profiles available on our platform.</p><p>Thank you once again for choosing our Matrimony Application. We wish you a wonderful experience in finding your life partner.</p><p>Best regards,<br>Matrimony Application</p>'
// };

exports.uploadastro = async (req, res, file) => {
  uploadastro(req, res, function (err) {
    if (err) {
      if (err instanceof multer.MulterError && err.code == "LIMIT_FILE_SIZE") {
        return res.send("File size is maximum 2mb");
      } const uploadastro = multer({
        storage: storagefam,
        limits: { fileSize: 10000000 }, // 10MB file size limit
        fileFilter: function (req, file, cb) {
          checkFileType(file, cb);
        }
      }).single('fileastro');
      res.send(err);
    } else {
      // transporter.sendMail(mailOptions, (error, info) => {
      //   if (error) {
      //     console.log('Error occurred:', error);
      //   } else {
      //     console.log('Email sent:', info.response);
      //   }
      // });
      var user_id = req.body.id;
      res.status(200).redirect(`/home?user_id=${user_id}`);
    }
  })
}

exports.otpverification = async (req, res) => {
  console.log("otp verfy" + req.body.opt1);
  var otp = req.body.opt1 + req.body.opt2 + req.body.opt3 + req.body.opt4;
  console.log(otp);
  var email = req.body.email;
  db.query(
    "SELECT otp FROM mat_users where email = ?", [req.body.email],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result[0].otp);
        if (result[0].otp == otp) {
          return res.render("login", {
            msg: "User Registration Success",
            msg_type: "good",
          });
        } else {
          return res.render("otp", {
            msg: "Invalid OPT",
            email: email,
          });
        }

      }

    }
  );
}
