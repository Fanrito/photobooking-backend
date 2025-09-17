// routes/bookings.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/** 提交预约 */
router.post("/", (req, res) => {
  const { exhibition_id, day_id, timeslot_id, cn, qq, role, notes } = req.body;
  console.log(req.body.qq);
  

  const insert = db.prepare(
    "INSERT INTO bookings (exhibition_id, day_id, timeslot_id, cn, qq, role, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'booked')"
  );

  try {
    const result = insert.run(exhibition_id, day_id, timeslot_id, cn, qq, role, notes);
    res.json({ success: true, bookingId: result.lastInsertRowid });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ success: false, message: "该时段已被预约" });
    } else {
      console.error(err);
      res.status(500).json({ success: false, message: "服务器错误" });
    }
  }
});


/** 取消预约 */
router.post("/:id/cancel", (req, res) => {
  const { qq } = req.body;
  const id = req.params.id;

  // 先校验 CN+QQ 是否匹配
  const booking = db.prepare("SELECT * FROM bookings WHERE id=?").get(id);
  if (!booking) return res.status(404).json({ success: false, message: "预约不存在" });
  if (booking.cn !== req.body.cn || booking.qq !== qq)
    return res.status(403).json({ success: false, message: "CN或QQ不匹配，无法取消" });

  const result = db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(id);
  res.json({ success: true, updated: result.changes });
});


router.get("/search", (req, res) => {
  const { cn, qq } = req.query;
  if (!cn || !qq) return res.status(400).json({ success: false, message: "CN和QQ必须提供" });

  const rows = db.prepare(
    `SELECT b.*, ed.day_label, t.start_time, t.end_time, e.name as exhibition_name
     FROM bookings b
     JOIN exhibition_days ed ON b.day_id = ed.id
     JOIN timeslots t ON b.timeslot_id = t.id
     JOIN exhibitions e ON b.exhibition_id = e.id
     WHERE b.cn=? AND b.qq=? AND b.status='booked'
     ORDER BY ed.date, t.slot_index`
  ).all(cn, qq);

  res.json(rows);
});



/** 后台查询预约列表 */
router.get("/", (req, res) => {
  const { exhibition_id } = req.query;
  const rows = db
    .prepare(
      `SELECT b.*, ed.day_label, t.start_time, t.end_time
       FROM bookings b
       JOIN exhibition_days ed ON b.day_id = ed.id
       JOIN timeslots t ON b.timeslot_id = t.id
       WHERE b.exhibition_id = ?
       ORDER BY ed.id, t.slot_index`
    )
    .all(exhibition_id);
  res.json(rows);
});

export default router;
