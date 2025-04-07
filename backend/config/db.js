const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "", // ⚠️ 你的 MySQL 密码
    database: "exam_system",
});

db.getConnection((err, connection) => {
    if (err) console.error("❌ MySQL 连接失败:", err);
    else {
        console.log("✅ MySQL 连接成功");
        connection.release();
    }
});

module.exports = db;