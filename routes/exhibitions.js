// routes/exhibitions.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/** 创建一场漫展 */
router.post("/", (req, res) => {
  const { name, description } = req.body;
  const stmt = db.prepare(
    "INSERT INTO exhibitions (name, description) VALUES (?, ?)"
  );
  const result = stmt.run(name, description);
  res.json({ success: true, exhibitionId: result.lastInsertRowid });
});

/** 获取所有漫展 */
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM exhibitions ORDER BY id DESC").all();
  res.json(rows);
});

/** 为某个漫展添加一天 */
router.post("/:id/days", (req, res) => {
  const exhibitionId = req.params.id;
  const { day_label, date } = req.body;
  const stmt = db.prepare(
    "INSERT INTO exhibition_days (exhibition_id, day_label, date) VALUES (?, ?, ?)"
  );
  const result = stmt.run(exhibitionId, day_label, date);
  res.json({ success: true, dayId: result.lastInsertRowid });
});

/** 为某个 day 生成 14 个时段 */
router.post("/:id/days/:dayId/generate-timeslots", (req, res) => {
  const exhibitionId = req.params.id;
  const dayId = req.params.dayId;

  const startHour = 10;
  const totalSlots = 14;
  const stmt = db.prepare(
    "INSERT INTO timeslots (exhibition_id, day_id, slot_index, start_time, end_time) VALUES (?, ?, ?, ?, ?)"
  );

  const insertMany = db.transaction(() => {
    for (let i = 0; i < totalSlots; i++) {
      const h = Math.floor((startHour * 60 + i * 30) / 60);
      const m = (startHour * 60 + i * 30) % 60;
      const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const endMins = startHour * 60 + i * 30 + 30;
      const eh = Math.floor(endMins / 60);
      const em = endMins % 60;
      const end = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
      stmt.run(exhibitionId, dayId, i, start, end);
    }
  });

  insertMany();
  res.json({ success: true, message: "14 slots generated" });
});

/** 获取某个漫展的天和时段 */
router.get("/:id/days", (req, res) => {
  const exhibitionId = req.params.id;
  const days = db
    .prepare("SELECT * FROM exhibition_days WHERE exhibition_id = ?")
    .all(exhibitionId);

  for (const day of days) {
    const timeslots = db
      .prepare(
        `SELECT t.*, 
        b.cn, b.qq, b.role, b.notes,
        EXISTS (SELECT 1 FROM bookings b2 WHERE b2.timeslot_id=t.id AND b2.status='booked') as is_booked
        FROM timeslots t
        LEFT JOIN bookings b ON b.timeslot_id = t.id AND b.status='booked'
        WHERE t.day_id = ? ORDER BY t.slot_index`
      )
      .all(day.id);
    day.timeslots = timeslots;
  }

  res.json(days);
});


export default router;
