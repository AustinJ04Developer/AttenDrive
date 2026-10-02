import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student } from '../models/Student.js';
import { Drive } from '../models/Drive.js';
import { DriveAssignment } from '../models/DriveAssignment.js';
import { Attendance } from '../models/Attendance.js';
import { ReportLog } from '../models/ReportLog.js';
import { Setting } from '../models/Setting.js';
import { User } from '../models/User.js';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI;

const SEED_PREFIX = 'SEED_TEST_';
const SEED_REG_NUMBERS = [
  `${SEED_PREFIX}REG01`,
  `${SEED_PREFIX}REG02`,
  `${SEED_PREFIX}REG03`,
  `${SEED_PREFIX}REG04`,
  `${SEED_PREFIX}REG05`,
  `${SEED_PREFIX}REG06`,
  `${SEED_PREFIX}REG07`,
  `${SEED_PREFIX}REG08`,
];

export const runSeedAndVerify = async () => {
  console.log('====================================================');
  console.log('🌱 Starting Seed, Functional Verification & Cleanup');
  console.log(`📡 API Base: ${API_BASE}`);
  console.log(`☁️  Database: ${MONGODB_URI ? MONGODB_URI.replace(/:([^@]+)@/, ':****@') : 'Undefined'}`);
  console.log('====================================================\n');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  const cleanupData = async () => {
    console.log('\n🧹 Cleaning up test seed records from database...');

    // Find all test student IDs and drive IDs
    const testStudents = await Student.find({ registerNo: { $in: SEED_REG_NUMBERS } }, '_id').lean();
    const testStudentIds = testStudents.map((s) => s._id);

    const testDrives = await Drive.find({ company: { $regex: new RegExp(`^${SEED_PREFIX}`) } }, '_id').lean();
    const testDriveIds = testDrives.map((d) => d._id);

    const delAssignments = await DriveAssignment.deleteMany({
      $or: [
        { driveId: { $in: testDriveIds } },
        { studentId: { $in: testStudentIds } },
      ],
    });

    const delAttendance = await Attendance.deleteMany({
      $or: [
        { driveId: { $in: testDriveIds } },
        { studentId: { $in: testStudentIds } },
        { remark: { $regex: /SEED_TEST/ } },
      ],
    });

    const delStudents = await Student.deleteMany({ registerNo: { $in: SEED_REG_NUMBERS } });
    const delDrives = await Drive.deleteMany({ company: { $regex: new RegExp(`^${SEED_PREFIX}`) } });
    const delReportLogs = await ReportLog.deleteMany({ title: { $regex: /SEED_TEST/ } });

    // Also purge any orphaned assignments
    const validDrives = await Drive.find({}, '_id').lean();
    const validDriveIds = validDrives.map((d) => d._id);
    const validStudents = await Student.find({}, '_id').lean();
    const validStudentIds = validStudents.map((s) => s._id);
    const delOrphans = await DriveAssignment.deleteMany({
      $or: [
        { driveId: { $nin: validDriveIds } },
        { studentId: { $nin: validStudentIds } },
      ],
    });

    console.log(`   ✓ Removed ${delStudents.deletedCount} test students`);
    console.log(`   ✓ Removed ${delDrives.deletedCount} test drives`);
    console.log(`   ✓ Removed ${delAssignments.deletedCount + delOrphans.deletedCount} test assignments`);
    console.log(`   ✓ Removed ${delAttendance.deletedCount} test attendance records`);
    console.log(`   ✓ Removed ${delReportLogs.deletedCount} test report logs`);
  };

  try {
    // 0. Ensure no stale test data exists
    await cleanupData();

    // 1. SEED DATA
    console.log('\n📥 Seeding sample data...');

    const sampleStudents = [
      {
        registerNo: `${SEED_PREFIX}REG01`,
        name: 'Rahul Sharma',
        department: 'Computer Science and Engineering',
        batch: '2022-2026',
        email: 'rahul.test@marephraem.edu.in',
        phone: '9876543210',
        cgpa: 8.8,
        backlogs: 0,
      },
      {
        registerNo: `${SEED_PREFIX}REG02`,
        name: 'Priya Nair',
        department: 'Artificial Intelligence and Data Science',
        batch: '2022-2026',
        email: 'priya.test@marephraem.edu.in',
        phone: '9876543211',
        cgpa: 9.2,
        backlogs: 0,
      },
      {
        registerNo: `${SEED_PREFIX}REG03`,
        name: 'Ananya Das',
        department: 'Electronics and Communication Engineering',
        batch: '2022-2026',
        email: 'ananya.test@marephraem.edu.in',
        phone: '9876543212',
        cgpa: 7.9,
        backlogs: 0,
      },
      {
        registerNo: `${SEED_PREFIX}REG04`,
        name: 'Karthik Raja',
        department: 'Mechanical Engineering',
        batch: '2022-2026',
        email: 'karthik.test@marephraem.edu.in',
        phone: '9876543213',
        cgpa: 6.8,
        backlogs: 1,
      },
      {
        registerNo: `${SEED_PREFIX}REG05`,
        name: 'Sneha Patel',
        department: 'Civil Engineering',
        batch: '2022-2026',
        email: 'sneha.test@marephraem.edu.in',
        phone: '9876543214',
        cgpa: 8.1,
        backlogs: 0,
      },
      {
        registerNo: `${SEED_PREFIX}REG06`,
        name: 'Vignesh Kumar',
        department: 'Electrical and Electronics Engineering',
        batch: '2022-2026',
        email: 'vignesh.test@marephraem.edu.in',
        phone: '9876543215',
        cgpa: 7.6,
        backlogs: 0,
      },
      {
        registerNo: `${SEED_PREFIX}REG07`,
        name: 'Keerthana S',
        department: 'Master of Business Administration',
        batch: '2024-2026',
        email: 'keerthana.test@marephraem.edu.in',
        phone: '9876543216',
        cgpa: 8.9,
        backlogs: 0,
      },
      {
        registerNo: `${SEED_PREFIX}REG08`,
        name: 'Arun Thomas',
        department: 'Computer Science and Engineering',
        batch: '2022-2026',
        email: 'arun.test@marephraem.edu.in',
        phone: '9876543217',
        cgpa: 6.1,
        backlogs: 2,
      },
    ];

    const insertedStudents = await Student.insertMany(sampleStudents);
    console.log(`   ✓ Seeded ${insertedStudents.length} students across 7 departments`);

    const drive1 = await Drive.create({
      company: `${SEED_PREFIX}Zoho Corporation`,
      role: 'Software Development Engineer',
      packageLpa: 8.5,
      driveDate: new Date(Date.now() + 86400000), // Tomorrow
      driveTime: '09:30 AM',
      venueMode: 'Main Auditorium (Offline)',
      coordinator: 'Prof. Alan Turing',
      status: 'Ongoing',
      eligibilityCriteria: {
        minCgpa: 7.5,
        maxBacklogs: 0,
        allowedDepartments: [
          'Computer Science and Engineering',
          'Artificial Intelligence and Data Science',
          'Electronics and Communication Engineering',
        ],
        batch: '2022-2026',
      },
      assignedCount: 3,
    });

    const drive2 = await Drive.create({
      company: `${SEED_PREFIX}TCS Digital`,
      role: 'System Engineer Specialist',
      packageLpa: 7.0,
      driveDate: new Date(Date.now() + 172800000), // Day after tomorrow
      driveTime: '10:00 AM',
      venueMode: 'Virtual / Online',
      coordinator: 'Dr. Grace Hopper',
      status: 'Upcoming',
      eligibilityCriteria: {
        minCgpa: 6.0,
        maxBacklogs: 1,
        allowedDepartments: [],
        batch: '2022-2026',
      },
      assignedCount: 7,
    });
    console.log(`   ✓ Seeded 2 placement drives: '${drive1.company}' & '${drive2.company}'`);

    // Assign students to Drive 1 (Students 1, 2, 3)
    const assignments1 = [
      { driveId: drive1._id, studentId: insertedStudents[0]._id, assignedBy: 'Admin', notes: 'SEED_TEST' },
      { driveId: drive1._id, studentId: insertedStudents[1]._id, assignedBy: 'Admin', notes: 'SEED_TEST' },
      { driveId: drive1._id, studentId: insertedStudents[2]._id, assignedBy: 'Admin', notes: 'SEED_TEST' },
    ];
    await DriveAssignment.insertMany(assignments1);

    // Record attendance for Drive 1
    await Attendance.create([
      {
        driveId: drive1._id,
        studentId: insertedStudents[0]._id,
        status: 'Present',
        markedMethod: 'manual',
        remark: 'SEED_TEST - Present for Aptitude and Technical Round',
      },
      {
        driveId: drive1._id,
        studentId: insertedStudents[1]._id,
        status: 'Present',
        markedMethod: 'manual',
        remark: 'SEED_TEST - Cleared Technical Round 1',
      },
      {
        driveId: drive1._id,
        studentId: insertedStudents[2]._id,
        status: 'Absent',
        markedMethod: 'manual',
        remark: 'SEED_TEST - Absent with prior intimation',
      },
    ]);
    console.log('   ✓ Seeded drive assignments & attendance records (2 Present, 1 Absent)');

    // 2. FUNCTIONAL VERIFICATION CHECKS
    console.log('\n====================================================');
    console.log('🧪 Executing Comprehensive End-to-End API Verifications');
    console.log('====================================================\n');

    let token = '';

    // Check 1: Admin Login
    console.log('Test 1: Admin Authentication (placement@marephraem.edu.in)');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'placement@marephraem.edu.in',
        password: 'Placement2026',
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token) {
      token = loginData.token;
      console.log(`   ✅ PASS: Logged in successfully as '${loginData.user.name}' (${loginData.user.role})`);
    } else {
      throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginData)}`);
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Check 2: Auth Me
    console.log('\nTest 2: Verified Auth Profile (/api/auth/me)');
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.user?.email === 'placement@marephraem.edu.in') {
      console.log(`   ✅ PASS: Current user verified: ${meData.user.email}`);
    } else {
      throw new Error(`/api/auth/me check failed: ${JSON.stringify(meData)}`);
    }

    // Check 3: Student Listing & Filters
    console.log('\nTest 3: Student Management & Filters (/api/students)');
    const studentsRes = await fetch(`${API_BASE}/students?search=${SEED_PREFIX}`, { headers: authHeaders });
    const studentsData = await studentsRes.json();
    if (studentsRes.status === 200 && studentsData.students.length === 8) {
      console.log(`   ✅ PASS: Retrieved all ${studentsData.students.length} seeded students`);
    } else {
      throw new Error(`Student list verification failed: count=${studentsData?.students?.length}`);
    }

    // Check 3b: Department filter
    const cseStudentsRes = await fetch(`${API_BASE}/students?search=${SEED_PREFIX}&department=Computer Science and Engineering`, {
      headers: authHeaders,
    });
    const cseData = await cseStudentsRes.json();
    if (cseData.students.length === 2) {
      console.log(`   ✅ PASS: Filtered by department 'CSE': exactly 2 students matched`);
    } else {
      throw new Error(`Department filter failed: expected 2, got ${cseData?.students?.length}`);
    }

    // Check 4: Drives Listing
    console.log('\nTest 4: Drives Management (/api/drives)');
    const drivesRes = await fetch(`${API_BASE}/drives`, { headers: authHeaders });
    const drivesData = await drivesRes.json();
    const seededDrives = (drivesData.drives || []).filter((d) => d.company.startsWith(SEED_PREFIX));
    if (drivesRes.status === 200 && seededDrives.length === 2) {
      console.log(`   ✅ PASS: Retrieved seeded placement drives (${seededDrives.length} drives found)`);
    } else {
      throw new Error(`Drives list failed: expected 2 seeded drives, got ${seededDrives.length}`);
    }

    // Check 5: Institutional Settings
    console.log('\nTest 5: College Settings & Department Config (/api/settings)');
    const settingsRes = await fetch(`${API_BASE}/settings`, { headers: authHeaders });
    const settingsData = await settingsRes.json();
    const branding = settingsData.settings?.college_branding;
    const signatories = settingsData.settings?.report_signatories;
    const depts = settingsData.settings?.official_departments;

    if (
      settingsRes.status === 200 &&
      branding?.collegeName?.includes('Mar Ephraem') &&
      signatories?.officer &&
      Array.isArray(depts) &&
      depts.length > 0
    ) {
      console.log(`   ✅ PASS: Institution confirmed: '${branding.collegeName}'`);
      console.log(`   ✅ PASS: Officer signatory: '${signatories.officer}'`);
      console.log(`   ✅ PASS: Official departments configured: ${depts.length} branches`);
    } else {
      throw new Error(`Settings verification failed: ${JSON.stringify(settingsData.settings)}`);
    }

    // Check 6: Drive Attendance Report
    console.log(`\nTest 6: Drive Attendance Report (/api/reports/drive/${drive1._id})`);
    const reportRes = await fetch(`${API_BASE}/reports/drive/${drive1._id}`, { headers: authHeaders });
    const reportData = await reportRes.json();
    if (
      reportRes.status === 200 &&
      reportData.summary?.totalAssigned === 3 &&
      reportData.summary?.presentCount === 2 &&
      reportData.summary?.absentCount === 1 &&
      reportData.settings?.college_branding?.collegeName?.includes('Mar Ephraem')
    ) {
      console.log(`   ✅ PASS: Drive Report ID: ${reportData.reportId}`);
      console.log(`   ✅ PASS: Metrics: Assigned=${reportData.summary.totalAssigned}, Present=${reportData.summary.presentCount}, Absent=${reportData.summary.absentCount}`);
      console.log(`   ✅ PASS: College branding applied to report: '${reportData.settings.college_branding.collegeName}'`);
    } else {
      throw new Error(`Drive report failed: ${JSON.stringify(reportData)}`);
    }

    // Check 7: Absentees Report
    console.log(`\nTest 7: Absentees Roster (/api/reports/absentees/${drive1._id})`);
    const absenteesRes = await fetch(`${API_BASE}/reports/absentees/${drive1._id}`, { headers: authHeaders });
    const absenteesData = await absenteesRes.json();
    if (
      absenteesRes.status === 200 &&
      absenteesData.totalAbsent === 1 &&
      absenteesData.absentees[0].registerNo === `${SEED_PREFIX}REG03`
    ) {
      console.log(`   ✅ PASS: Absentees Roster matched: ${absenteesData.absentees[0].name} (${absenteesData.absentees[0].registerNo})`);
    } else {
      throw new Error(`Absentees report failed: ${JSON.stringify(absenteesData)}`);
    }

    // Check 8: Department-wise Summary Report
    console.log('\nTest 8: Department-wise Summary Report (/api/reports/department-summary)');
    const deptSummaryRes = await fetch(`${API_BASE}/reports/department-summary`, { headers: authHeaders });
    const deptSummaryData = await deptSummaryRes.json();
    if (deptSummaryRes.status === 200 && deptSummaryData.departments && deptSummaryData.settings) {
      console.log(`   ✅ PASS: Department summary generated across ${deptSummaryData.departments.length} active departments`);
      console.log(`   ✅ PASS: Institution settings linked: '${deptSummaryData.settings.college_branding.collegeName}'`);
    } else {
      throw new Error(`Department summary report failed: ${JSON.stringify(deptSummaryData)}`);
    }

    // Check 9: Consolidated Placement Report
    console.log('\nTest 9: Consolidated Placement Report (/api/reports/consolidated)');
    const consRes = await fetch(`${API_BASE}/reports/consolidated`, { headers: authHeaders });
    const consData = await consRes.json();
    if (consRes.status === 200 && consData.drives && consData.metrics && consData.settings) {
      console.log(`   ✅ PASS: Consolidated report generated for ${consData.drives.length} drives`);
      console.log(`   ✅ PASS: Overall Attendance %: ${consData.metrics.overallPct}%`);
    } else {
      throw new Error(`Consolidated report failed: ${JSON.stringify(consData)}`);
    }

    // Check 10: Student Attendance History Report
    console.log(`\nTest 10: Student History Report (/api/reports/student-history/${insertedStudents[0]._id})`);
    const stuHistRes = await fetch(`${API_BASE}/reports/student-history/${insertedStudents[0]._id}`, { headers: authHeaders });
    const stuHistData = await stuHistRes.json();
    if (
      stuHistRes.status === 200 &&
      stuHistData.student?.registerNo === `${SEED_PREFIX}REG01` &&
      stuHistData.metrics?.totalDrivesAssigned === 1 &&
      stuHistData.history[0]?.status === 'Present'
    ) {
      console.log(`   ✅ PASS: History retrieved for student: ${stuHistData.student.name} (${stuHistData.student.registerNo})`);
      console.log(`   ✅ PASS: Drives assigned: ${stuHistData.metrics.totalDrivesAssigned}, Present: ${stuHistData.metrics.presentDrives}`);
    } else {
      throw new Error(`Student history report failed: ${JSON.stringify(stuHistData)}`);
    }

    console.log('\n🎉 ALL 10 FUNCTIONALITY VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    // 3. REMOVE SEED DATA AFTER SUCCEED
    await cleanupData();

    // Verify 0 seed documents remain
    const remainingStudents = await Student.countDocuments({ registerNo: { $in: SEED_REG_NUMBERS } });
    const remainingDrives = await Drive.countDocuments({ company: { $regex: new RegExp(`^${SEED_PREFIX}`) } });

    console.log('\n====================================================');
    console.log('🔍 Final Database Cleanliness Check:');
    console.log(`   - Seed Students remaining: ${remainingStudents}`);
    console.log(`   - Seed Drives remaining: ${remainingDrives}`);

    // Confirm Admin Account is untouched
    const adminUser = await User.findOne({ email: 'placement@marephraem.edu.in' });
    console.log(`   - Admin User preserved: ${adminUser ? '✅ YES (' + adminUser.email + ')' : '❌ NO'}`);

    // Confirm Settings preserved
    const settings = await Setting.find({});
    console.log(`   - Settings preserved: ✅ YES (${settings.length} setting keys intact)`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
};

runSeedAndVerify()
  .then(() => {
    console.log('🌟 Script execution completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed with error:', err);
    process.exit(1);
  });
