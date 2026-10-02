import express from 'express';

const router = express.Router();

const templates = {
  students: {
    filename: 'students_template.csv',
    content: `Register No,Name,Department,Batch,Email,Phone,CGPA,Backlogs
21CS001,John Doe,Computer Science and Engineering,2021-2025,john.doe@college.edu,9876543210,8.45,0
21CS002,Jane Smith,Computer Science and Engineering,2021-2025,jane.smith@college.edu,9876543211,7.90,1
21IT001,Robert Johnson,Information Technology,2021-2025,robert.j@college.edu,9876543212,8.80,0
21EC001,Emily Brown,Electronics and Communication,2021-2025,emily.b@college.edu,9876543213,6.50,2`,
  },
  drives: {
    filename: 'drives_template.csv',
    content: `Company,Role,Package LPA,Drive Date,Drive Time,Venue / Mode,Coordinator,Min CGPA,Max Backlogs,Allowed Departments,Batch
TechCorp Global,Software Engineer,12,2026-10-15,09:30 AM,Campus Auditorium (Offline),Prof. Alan Turing,7.5,0,"Computer Science and Engineering, Information Technology",2021-2025
DataNova Systems,Data Analyst,8.5,2026-10-20,10:00 AM,Virtual Google Meet (Online),Dr. Grace Hopper,7.0,1,"Computer Science and Engineering, Information Technology, Electronics and Communication",2021-2025`,
  },
  assignment: {
    filename: 'assignment_template.csv',
    content: `Register No
21CS001
21CS002
21IT001`,
  },
  attendance: {
    filename: 'attendance_template.csv',
    content: `Register No,Status,Remark
21CS001,Present,
21CS002,Absent,Informed medical leave
21IT001,Late,Arrived 15 mins late
21EC001,Present,`,
  },
};

router.get('/:type', (req, res) => {
  const { type } = req.params;
  const template = templates[type.toLowerCase()];

  if (!template) {
    return res.status(404).json({
      success: false,
      message: `Template '${type}' not found. Available: students, drives, assignment, attendance`,
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
  res.send(template.content);
});

export default router;
