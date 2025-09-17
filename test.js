// test.js
import Database from "better-sqlite3";

const DB_PATH = "./database.sqlite"; // 根据你的实际 db 文件名调整
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

try {
  // 1) 新建一场漫展
  const insertExh = db.prepare(
    "INSERT INTO exhibitions (name, description) VALUES (?, ?)"
  );
  const exRes = insertExh.run("测试漫展", "用于后端测试");
  const exhibitionId = exRes.lastInsertRowid;
  console.log("✅ 新建漫展，id =", exhibitionId);

  // 2) 为该漫展插入两天 d1/d2
  const insertDay = db.prepare(
    "INSERT INTO exhibition_days (exhibition_id, day_label, date) VALUES (?, ?, ?)"
  );
  const day1 = insertDay.run(exhibitionId, "d1", "2025-10-01").lastInsertRowid;
  const day2 = insertDay.run(exhibitionId, "d2", "2025-10-02").lastInsertRowid;
  console.log("✅ 新建两天，day1 =", day1, ", day2 =", day2);

  // 3) 为 day 生成 14 个 timeslots 的事务函数
  const insertSlot = db.prepare(
    "INSERT INTO timeslots (exhibition_id, day_id, slot_index, start_time, end_time) VALUES (?, ?, ?, ?, ?)"
  );
  const genSlots = db.transaction((exId, dayId) => {
    const startMinutes = 10 * 60; // 10:00 -> minutes
    for (let i = 0; i < 14; i++) {
      const s = startMinutes + i * 30;
      const e = s + 30;
      const start = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      const end = `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
      insertSlot.run(exId, dayId, i, start, end);
    }
  });

  genSlots(exhibitionId, day1);
  genSlots(exhibitionId, day2);
  console.log("✅ 为两天各生成 14 个时段");

  // 4) 查询并打印 day1 的时段（并展示 is_booked）
  const timeslots = db.prepare(
    `SELECT t.id, t.slot_index, t.start_time, t.end_time, t.is_active,
      EXISTS(SELECT 1 FROM bookings b WHERE b.timeslot_id = t.id AND b.status = 'booked') AS is_booked
     FROM timeslots t
     WHERE t.day_id = ?
     ORDER BY t.slot_index`
  ).all(day1);
  console.log(`📋 day_id=${day1} 的时段（共 ${timeslots.length} 条）：`);
  console.table(timeslots);

  // 5) 为第一个时段创建一次预约（status = 'booked'）
  const firstSlotId = timeslots[0].id;
  const insertBooking = db.prepare(
    `INSERT INTO bookings (exhibition_id, day_id, timeslot_id, cn, role, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'booked')`
  );

  try {
    const bkRes = insertBooking.run(exhibitionId, day1, firstSlotId, "测试CN", "角色A", "需要光剑");
    console.log("✅ 预约成功，booking id =", bkRes.lastInsertRowid);
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      console.error("❌ 预约失败：该时段已被预约（唯一约束）");
    } else {
      throw err;
    }
  }

  // 6) 查询并打印该漫展的所有预约
  const bookings = db.prepare(
    `SELECT b.id, b.cn, b.role, b.notes, b.status, ed.day_label, t.start_time, t.end_time, b.created_at
     FROM bookings b
     JOIN exhibition_days ed ON b.day_id = ed.id
     JOIN timeslots t ON b.timeslot_id = t.id
     WHERE b.exhibition_id = ?
     ORDER BY ed.id, t.slot_index`
  ).all(exhibitionId);

  console.log("📋 当前该漫展的预约：");
  console.table(bookings);

} catch (err) {
  console.error("脚本执行出错：", err);
} finally {
  db.close();
}
