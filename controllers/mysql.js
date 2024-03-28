const mysql = require("mysql");

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    database: process.env.DATABASE,
});
db.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("MySQL Connection Success");
    }
});

module.exports = db;