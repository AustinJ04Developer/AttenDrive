import mongoose from 'mongoose';
import { Drive } from '../models/Drive.js';
import { Student } from '../models/Student.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { Attendance } from '../models/Attendance.js';
import { ReportLog } from '../models/ReportLog.js';
import { Setting } from '../models/Setting.js';

// Helper to get college branding and signature settings
const getCollegeSettings = async () => {
  const settings = await Setting.find().lean();
  const map = {
    college_branding: {
      headerMode: 'banner', // 'banner' | 'full_page' | 'preprinted' | 'custom'
      collegeName: 'National Institute of Technology & Engineering',
      address: 'University Campus, Placement Division, Knowledge City - 560001',
      logo: '',
      letterheadImage: '',
      fullPageLetterhead: '',
      preprintedMarginTop: 45,
      email: 'placements@nite.edu.in',
      phone: '+91 80 2345 6789',
    },
    report_signatories: {
      officer: 'Prof. Alan Turing (Placement Officer)',
      coordinator: 'Dr. Grace Hopper (Drive Coordinator)',
      principal: 'Dr. John von Neumann (Principal)',
    },
    default_orientation: 'portrait',
  };

  settings.forEach((s) => {
    map[s.key] = s.value;
  });

  return map;
};

// 1. Main Drive Attendance Report
export const getDriveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await Drive.findById(id).lean();

    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    // 1. Assigned students
    const assignments = await DriveAssignment.find({ driveId: id })
      .populate('studentId')
      .lean();

    const assignedStudents = assignments
      .map((a) => a.studentId)
      .filter(Boolean);

    // 2. Attendance records
    const attendanceRecords = await Attendance.find({ driveId: id }).lean();
    const attMap = new Map();
    attendanceRecords.forEach((att) => attMap.set(String(att.studentId), att));

    // 3. Department-wise aggregation
    const deptMap = new Map();

    const students = assignedStudents.map((s, index) => {
      const att = attMap.get(String(s._id));
      const status = att ? att.status : 'Absent'; // Default to Absent if unmarked
      const remark = att ? att.remark : '';

      // Aggregate dept stats
      const deptName = s.department || 'General';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { department: deptName, assigned: 0, present: 0, absent: 0, late: 0 });
      }
      const deptStats = deptMap.get(deptName);
      deptStats.assigned++;
      if (status === 'Present') deptStats.present++;
      else if (status === 'Absent') deptStats.absent++;
      else if (status === 'Late') deptStats.late++;

      return {
        sNo: index + 1,
        studentId: s._id,
        registerNo: s.registerNo,
        name: s.name,
        department: s.department,
        batch: s.batch,
        status,
        remark,
      };
    });

    const departmentSummary = Array.from(deptMap.values()).map((d) => ({
      ...d,
      attendancePct: d.assigned > 0 ? Math.round(((d.present + d.late) / d.assigned) * 100) : 0,
    }));

    // Summary counts
    const totalAssigned = students.length;
    const presentCount = students.filter((s) => s.status === 'Present').length;
    const absentCount = students.filter((s) => s.status === 'Absent').length;
    const lateCount = students.filter((s) => s.status === 'Late').length;
    const attendancePct = totalAssigned > 0 ? Math.round(((presentCount + lateCount) / totalAssigned) * 100) : 0;

    // Separate absentees list
    const absentees = students
      .filter((s) => s.status === 'Absent')
      .map((s, idx) => ({ ...s, sNo: idx + 1 }));

    // Settings
    const settings = await getCollegeSettings();

    // Log report generation
    await ReportLog.create({
      driveId: drive._id,
      type: 'drive_attendance',
      title: `${drive.company} Drive Attendance Report`,
      meta: {
        totalAssigned,
        presentCount,
        absentCount,
      },
    });

    res.json({
      success: true,
      reportId: `REP-${drive._id.toString().substring(18).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      generatedAt: new Date().toISOString(),
      drive,
      settings,
      summary: {
        totalAssigned,
        presentCount,
        absentCount,
        lateCount,
        attendancePct,
      },
      departmentSummary,
      students,
      absentees,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Absentees List Report
export const getAbsenteesReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await Drive.findById(id).lean();

    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    const assignments = await DriveAssignment.find({ driveId: id })
      .populate('studentId')
      .lean();

    const attendanceRecords = await Attendance.find({ driveId: id }).lean();
    const attMap = new Map();
    attendanceRecords.forEach((att) => attMap.set(String(att.studentId), att));

    const absentees = [];
    assignments.forEach((a) => {
      const s = a.studentId;
      if (!s) return;
      const att = attMap.get(String(s._id));
      if (!att || att.status === 'Absent') {
        absentees.push({
          registerNo: s.registerNo,
          name: s.name,
          department: s.department,
          batch: s.batch,
          email: s.email,
          phone: s.phone,
          remark: att ? att.remark : 'Unmarked / Absent',
        });
      }
    });

    const settings = await getCollegeSettings();

    await ReportLog.create({
      driveId: drive._id,
      type: 'absentees',
      title: `${drive.company} Absentees List`,
      meta: { count: absentees.length },
    });

    res.json({
      success: true,
      reportId: `ABS-${drive._id.toString().substring(18).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      drive,
      settings,
      totalAbsent: absentees.length,
      absentees,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Student-wise Attendance History Report
export const getStudentHistoryReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Find all assignments and attendance for this student
    const [assignments, attendances] = await Promise.all([
      DriveAssignment.find({ studentId: student._id }).populate('driveId').lean(),
      Attendance.find({ studentId: student._id }).populate('driveId').lean(),
    ]);

    const attMap = new Map();
    attendances.forEach((att) => {
      if (att.driveId) attMap.set(String(att.driveId._id), att);
    });

    const history = assignments
      .filter((a) => a.driveId)
      .map((a) => {
        const drive = a.driveId;
        const att = attMap.get(String(drive._id));
        return {
          driveId: drive._id,
          company: drive.company,
          role: drive.role,
          packageLpa: drive.packageLpa,
          driveDate: drive.driveDate,
          venueMode: drive.venueMode,
          status: att ? att.status : 'Absent',
          remark: att ? att.remark : '',
          markedAt: att ? att.markedAt : null,
        };
      });

    const totalDrivesAssigned = history.length;
    const presentDrives = history.filter((h) => h.status === 'Present').length;
    const absentDrives = history.filter((h) => h.status === 'Absent').length;
    const lateDrives = history.filter((h) => h.status === 'Late').length;
    const overallPct = totalDrivesAssigned > 0 ? Math.round(((presentDrives + lateDrives) / totalDrivesAssigned) * 100) : 0;

    const settings = await getCollegeSettings();

    await ReportLog.create({
      type: 'student_history',
      title: `${student.registerNo} - ${student.name} Attendance History`,
      meta: { studentId: student._id, totalDrives: totalDrivesAssigned },
    });

    res.json({
      success: true,
      reportId: `STU-${student.registerNo}`,
      generatedAt: new Date().toISOString(),
      student,
      settings,
      metrics: {
        totalDrivesAssigned,
        presentDrives,
        absentDrives,
        lateDrives,
        overallPct,
      },
      history,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Department-wise Summary Report
export const getDepartmentSummaryReport = async (req, res, next) => {
  try {
    const drives = await Drive.find().lean();
    const driveIds = drives.map((d) => d._id);

    // Aggregate attendance grouped by student department
    const summary = await Attendance.aggregate([
      { $match: { driveId: { $in: driveIds } } },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student.department',
          totalSessions: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        },
      },
      {
        $project: {
          department: '$_id',
          totalSessions: 1,
          present: 1,
          absent: 1,
          late: 1,
          attendancePct: {
            $round: [
              {
                $multiply: [
                  { $divide: [{ $add: ['$present', '$late'] }, { $max: ['$totalSessions', 1] }] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { department: 1 } },
    ]);

    const settings = await getCollegeSettings();

    await ReportLog.create({
      type: 'department_summary',
      title: 'College Department-wise Attendance Summary',
      meta: { departmentsCount: summary.length },
    });

    res.json({
      success: true,
      reportId: `DEP-${Date.now().toString().slice(-6)}`,
      generatedAt: new Date().toISOString(),
      settings,
      totalDrives: drives.length,
      departments: summary,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Consolidated Multi-Drive Report
export const getConsolidatedReport = async (req, res, next) => {
  try {
    const { driveIds, startDate, endDate } = req.query;

    const filter = {};
    if (driveIds) {
      const ids = driveIds.split(',').map((id) => id.trim()).filter(Boolean);
      filter._id = { $in: ids };
    } else if (startDate || endDate) {
      filter.driveDate = {};
      if (startDate) filter.driveDate.$gte = new Date(startDate);
      if (endDate) filter.driveDate.$lte = new Date(endDate);
    }

    const drives = await Drive.find(filter).sort({ driveDate: 1 }).lean();
    const targetDriveIds = drives.map((d) => d._id);

    // Compute stats per drive
    const [assignments, attendanceStats] = await Promise.all([
      DriveAssignment.aggregate([
        { $match: { driveId: { $in: targetDriveIds } } },
        { $group: { _id: '$driveId', count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { driveId: { $in: targetDriveIds } } },
        {
          $group: {
            _id: '$driveId',
            totalMarked: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const assignMap = new Map();
    assignments.forEach((a) => assignMap.set(String(a._id), a.count));

    const attMap = new Map();
    attendanceStats.forEach((att) => attMap.set(String(att._id), att));

    let totalAssignedAll = 0;
    let totalPresentAll = 0;
    let totalAbsentAll = 0;
    let totalLateAll = 0;

    const consolidatedDrives = drives.map((d) => {
      const idStr = String(d._id);
      const assigned = assignMap.get(idStr) || 0;
      const att = attMap.get(idStr) || { present: 0, absent: 0, late: 0 };
      const pct = assigned > 0 ? Math.round(((att.present + att.late) / assigned) * 100) : 0;

      totalAssignedAll += assigned;
      totalPresentAll += att.present;
      totalAbsentAll += att.absent;
      totalLateAll += att.late;

      return {
        _id: d._id,
        company: d.company,
        role: d.role,
        packageLpa: d.packageLpa,
        driveDate: d.driveDate,
        venueMode: d.venueMode,
        status: d.status,
        finalized: d.finalized,
        assigned,
        present: att.present,
        absent: att.absent,
        late: att.late,
        attendancePct: pct,
      };
    });

    const settings = await getCollegeSettings();

    await ReportLog.create({
      type: 'consolidated',
      title: `Consolidated Report (${consolidatedDrives.length} drives)`,
      meta: { drivesCount: consolidatedDrives.length, totalAssignedAll },
    });

    res.json({
      success: true,
      reportId: `CON-${Date.now().toString().slice(-6)}`,
      generatedAt: new Date().toISOString(),
      settings,
      metrics: {
        totalDrives: consolidatedDrives.length,
        totalAssigned: totalAssignedAll,
        totalPresent: totalPresentAll,
        totalAbsent: totalAbsentAll,
        totalLate: totalLateAll,
        overallPct: totalAssignedAll > 0 ? Math.round(((totalPresentAll + totalLateAll) / totalAssignedAll) * 100) : 0,
      },
      drives: consolidatedDrives,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get Report Generation Audit History
export const getReportHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type } = req.query;

    const filter = {};
    if (type && type !== 'All') {
      filter.type = type;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

    const [logs, total] = await Promise.all([
      ReportLog.find(filter)
        .populate('driveId', 'company role driveDate')
        .sort({ generatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ReportLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
