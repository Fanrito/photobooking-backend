// db.js
import Database from "better-sqlite3";
import path from "path";

const dbFile = path.resolve("./database.sqlite");
const db = new Database(dbFile);

// 开启外键
db.exec("PRAGMA foreign_keys = ON");

export default db;
