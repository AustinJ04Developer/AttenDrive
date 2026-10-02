import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Shared Helper: Render Institutional Header (Banner, Full page, Pre-printed, or Custom Emblem)
const renderPDFHeader = (doc, branding, title, reportId, generatedAt, pageWidth, pageHeight, margin) => {
  let headerBottomY = 24;

  // Option 1: Full A4 Letterhead Page Template (Full-bleed background)
  if (branding?.headerMode === 'full_page' && branding?.fullPageLetterhead) {
    try {
      doc.addImage(branding.fullPageLetterhead, 'PNG', 0, 0, pageWidth, pageHeight);
      headerBottomY = 38;
    } catch (e) {
      console.warn('Failed to render full page letterhead in PDF', e);
      headerBottomY = 25;
    }
  }
  // Option 2: Pre-Printed Letterhead Stationery
  else if (branding?.headerMode === 'preprinted') {
    headerBottomY = Number(branding.preprintedMarginTop) || 45;
  }
  // Option 3: Top Letterhead Banner Image (e.g. Mar Ephraem header banner)
  else if ((branding?.headerMode === 'banner' || branding?.headerMode === 'letterhead') && branding?.letterheadImage) {
    try {
      const imgProps = doc.getImageProperties(branding.letterheadImage);
      const maxWidth = pageWidth - margin * 2;
      let bannerWidth = maxWidth;
      let bannerHeight = (imgProps.height * bannerWidth) / imgProps.width;
      if (bannerHeight > 36) {
        bannerHeight = 36;
        bannerWidth = (imgProps.width * bannerHeight) / imgProps.height;
      }
      const bannerX = (pageWidth - bannerWidth) / 2;
      const bannerY = 8;
      doc.addImage(branding.letterheadImage, imgProps.fileType || 'PNG', bannerX, bannerY, bannerWidth, bannerHeight);
      headerBottomY = bannerY + bannerHeight + 3;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
    } catch (e) {
      console.warn('Failed to render letterhead banner in PDF, falling back to text', e);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(20, 30, 50);
      doc.text(branding?.collegeName || 'Placement Operations Portal', pageWidth / 2, 16, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text(branding?.address || 'Placement & Training Division', pageWidth / 2, 21, { align: 'center' });

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(margin, 24, pageWidth - margin, 24);
      headerBottomY = 24;
    }
  }
  // Option 4: Structured Details + Emblem Logo
  else {
    if (branding?.logo) {
      try {
        const logoProps = doc.getImageProperties(branding.logo);
        const logoHeight = 14;
        const logoWidth = (logoProps.width * logoHeight) / logoProps.height;
        doc.addImage(branding.logo, logoProps.fileType || 'PNG', margin, 9, logoWidth, logoHeight);
      } catch (e) {
        console.warn('Failed to render logo', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 30, 50);
    doc.text(branding?.collegeName || 'Placement Operations Portal', pageWidth / 2, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(branding?.address || 'Placement & Training Division', pageWidth / 2, 21, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, 25, pageWidth - margin, 25);
    headerBottomY = 25;
  }

  // Report Title & Meta
  const metaY = headerBottomY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, metaY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Report ID: ${reportId || 'REP-001'}  |  Date: ${new Date(generatedAt || Date.now()).toLocaleDateString()}`,
    pageWidth - margin,
    metaY,
    { align: 'right' }
  );

  return metaY + 4;
};

// Shared Helper: Render Signatures and Page Footers
const renderPDFFooters = (doc, signatories, reportId, pageWidth, pageHeight, margin) => {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Signature lines on final page
    if (i === totalPages) {
      const sigY = pageHeight - 18;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);

      // Signatory 1: Placement Officer
      doc.line(margin, sigY, margin + 45, sigY);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(signatories?.officer || 'Placement Officer', margin, sigY + 4);

      // Signatory 2: Drive Coordinator
      doc.line(pageWidth / 2 - 22, sigY, pageWidth / 2 + 23, sigY);
      doc.text(signatories?.coordinator || 'Drive Coordinator', pageWidth / 2, sigY + 4, { align: 'center' });

      // Signatory 3: Principal / HOD
      doc.line(pageWidth - margin - 45, sigY, pageWidth - margin, sigY);
      doc.text(signatories?.principal || 'Principal / Dean', pageWidth - margin, sigY + 4, { align: 'right' });
    }

    // Page Number & Report ID Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    doc.text(`Doc ID: ${reportId || 'REP'}`, margin, pageHeight - 6);
    doc.text('AttenDrive System • Verified Placement Cell Record', pageWidth - margin, pageHeight - 6, { align: 'right' });
  }
};

// 1. Generate Main Placement Drive Report PDF
export const generateDriveReportPDF = ({
  reportData,
  options = {
    orientation: 'portrait',
    includeSignatures: true,
    includeRemarks: true,
    includeCharts: true,
    departmentFilter: '',
    statusFilter: '',
  },
}) => {
  const { drive, settings, summary, departmentSummary, students, absentees, reportId, generatedAt } = reportData;
  const branding = settings?.college_branding || {};
  const signatories = settings?.report_signatories || {};

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const currentY = renderPDFHeader(
    doc,
    branding,
    'PLACEMENT DRIVE ATTENDANCE REPORT',
    reportId,
    generatedAt,
    pageWidth,
    pageHeight,
    margin
  );

  // Drive Details Box
  const driveDateStr = drive?.driveDate ? new Date(drive.driveDate).toLocaleDateString() : 'TBD';
  const driveInfo = [
    [
      { content: `Company: ${drive?.company || 'N/A'}`, fontStyle: 'bold' },
      { content: `Role: ${drive?.role || '—'}` },
      { content: `Package: ${drive?.packageLpa ? `${drive.packageLpa} LPA` : '—'}` },
    ],
    [
      { content: `Date & Time: ${driveDateStr} ${drive?.driveTime || ''}` },
      { content: `Venue / Mode: ${drive?.venueMode || 'Offline'}` },
      { content: `Coordinator: ${drive?.coordinator || '—'}` },
    ],
    [
      { content: `Eligibility: CGPA ≥ ${drive?.eligibility?.minCgpa || 0} | Backlogs ≤ ${drive?.eligibility?.maxBacklogs ?? 0} | Batch: ${drive?.eligibility?.batch || 'All'}`, colSpan: 3 },
    ],
  ];

  doc.autoTable({
    startY: currentY + 1,
    body: driveInfo,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) * 0.35 },
      1: { cellWidth: (pageWidth - margin * 2) * 0.35 },
      2: { cellWidth: (pageWidth - margin * 2) * 0.3 },
    },
    margin: { left: margin, right: margin },
  });

  // Overall Attendance Summary Metric Cards
  const statsY = doc.lastAutoTable.finalY + 3;
  const colW = (pageWidth - margin * 2) / 5;

  const metrics = [
    { label: 'Assigned', val: summary?.totalAssigned || 0, bg: [241, 245, 249], text: [15, 23, 42] },
    { label: 'Present', val: summary?.presentCount || 0, bg: [236, 253, 245], text: [4, 120, 87] },
    { label: 'Absent', val: summary?.absentCount || 0, bg: [255, 241, 242], text: [190, 18, 60] },
    { label: 'Late', val: summary?.lateCount || 0, bg: [254, 243, 199], text: [180, 83, 9] },
    { label: 'Attendance %', val: `${summary?.attendancePct || 0}%`, bg: [238, 242, 255], text: [67, 56, 202] },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * colW;
    doc.setFillColor(...m.bg);
    doc.roundedRect(x + 0.5, statsY, colW - 1, 10, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + colW / 2, statsY + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...m.text);
    doc.text(String(m.val), x + colW / 2, statsY + 8, { align: 'center' });
  });

  // Attendance Student Table
  let tableY = statsY + 13;
  let filteredStudents = students || [];
  if (options.departmentFilter) {
    filteredStudents = filteredStudents.filter((s) => s.department === options.departmentFilter);
  }
  if (options.statusFilter && options.statusFilter !== 'All') {
    filteredStudents = filteredStudents.filter((s) => s.status === options.statusFilter);
  }

  const tableRows = filteredStudents.map((s, idx) => [
    idx + 1,
    s.registerNo,
    s.name,
    s.department,
    s.batch,
    s.status,
    options.includeRemarks ? s.remark || '—' : '',
    options.includeSignatures ? '' : '',
  ]);

  const headers = ['S.No', 'Reg No', 'Student Name', 'Department', 'Batch', 'Status'];
  if (options.includeRemarks) headers.push('Remark');
  if (options.includeSignatures) headers.push('Candidate Signature');

  doc.autoTable({
    startY: tableY,
    head: [headers],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 1.8,
    },
    styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { fontStyle: 'bold', cellWidth: 22 },
      2: { cellWidth: 38 },
      3: { cellWidth: 42 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      6: { cellWidth: options.includeSignatures ? 22 : 30 },
      7: { cellWidth: 24 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'Present') data.cell.styles.textColor = [4, 120, 87];
        else if (data.cell.raw === 'Absent') data.cell.styles.textColor = [190, 18, 60];
        else if (data.cell.raw === 'Late') data.cell.styles.textColor = [180, 83, 9];
      }
    },
    margin: { left: margin, right: margin, bottom: 25 },
  });

  renderPDFFooters(doc, signatories, reportId, pageWidth, pageHeight, margin);

  const dateSlug = drive?.driveDate ? new Date(drive.driveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const companySlug = (drive?.company || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`DriveReport_${companySlug}_${dateSlug}.pdf`);
};

// 2. Generate Department Summary Report PDF
export const generateDepartmentSummaryPDF = ({
  summaryData,
  settings,
  options = { orientation: 'portrait' },
}) => {
  const branding = settings?.college_branding || {};
  const signatories = settings?.report_signatories || {};

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const currentY = renderPDFHeader(
    doc,
    branding,
    'DEPARTMENT-WISE PLACEMENT ATTENDANCE SUMMARY',
    summaryData?.reportId || 'DEP-SUM',
    summaryData?.generatedAt,
    pageWidth,
    pageHeight,
    margin
  );

  const rows = (summaryData?.departments || []).map((d, idx) => [
    idx + 1,
    d.department,
    d.totalSessions,
    d.present,
    d.absent,
    d.late || 0,
    `${d.attendancePct}%`,
  ]);

  doc.autoTable({
    startY: currentY + 4,
    head: [['S.No', 'Department', 'Total Students', 'Present', 'Absent', 'Late', 'Attendance Rate']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center', textColor: [4, 120, 87] },
      4: { halign: 'center', textColor: [190, 18, 60] },
      5: { halign: 'center', textColor: [180, 83, 9] },
      6: { halign: 'center', fontStyle: 'bold', textColor: [67, 56, 202] },
    },
    margin: { left: margin, right: margin, bottom: 25 },
  });

  renderPDFFooters(doc, signatories, summaryData?.reportId, pageWidth, pageHeight, margin);
  doc.save(`Department_Summary_Report_${Date.now()}.pdf`);
};

// 3. Generate Consolidated Drives Report PDF
export const generateConsolidatedReportPDF = ({
  consolidatedData,
  settings,
  options = { orientation: 'portrait' },
}) => {
  const branding = settings?.college_branding || {};
  const signatories = settings?.report_signatories || {};

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const currentY = renderPDFHeader(
    doc,
    branding,
    'CONSOLIDATED PLACEMENT DRIVES REPORT',
    consolidatedData?.reportId || 'CON-REP',
    consolidatedData?.generatedAt,
    pageWidth,
    pageHeight,
    margin
  );

  const rows = (consolidatedData?.drives || []).map((d, idx) => [
    idx + 1,
    d.company,
    d.driveDate ? new Date(d.driveDate).toLocaleDateString() : '—',
    `${d.packageLpa} LPA`,
    d.assigned,
    d.present,
    d.absent,
    `${d.attendancePct}%`,
  ]);

  doc.autoTable({
    startY: currentY + 4,
    head: [['S.No', 'Company', 'Drive Date', 'Package', 'Assigned', 'Present', 'Absent', 'Attendance %']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'center', textColor: [4, 120, 87] },
      4: { halign: 'center' },
      5: { halign: 'center', textColor: [4, 120, 87] },
      6: { halign: 'center', textColor: [190, 18, 60] },
      7: { halign: 'center', fontStyle: 'bold', textColor: [67, 56, 202] },
    },
    margin: { left: margin, right: margin, bottom: 25 },
  });

  renderPDFFooters(doc, signatories, consolidatedData?.reportId, pageWidth, pageHeight, margin);
  doc.save(`Consolidated_Drives_Report_${Date.now()}.pdf`);
};

// 4. Generate Student History Report PDF
export const generateStudentHistoryPDF = ({
  studentData,
  settings,
  options = { orientation: 'portrait' },
}) => {
  const branding = settings?.college_branding || {};
  const signatories = settings?.report_signatories || {};

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const student = studentData?.student || {};
  const currentY = renderPDFHeader(
    doc,
    branding,
    `STUDENT ATTENDANCE HISTORY: ${student.name || ''} (${student.registerNo || ''})`,
    studentData?.reportId || 'STU-REP',
    studentData?.generatedAt,
    pageWidth,
    pageHeight,
    margin
  );

  const rows = (studentData?.history || []).map((h, idx) => [
    idx + 1,
    h.company,
    h.role,
    h.driveDate ? new Date(h.driveDate).toLocaleDateString() : '—',
    h.venueMode,
    h.status,
    h.remark || '—',
  ]);

  doc.autoTable({
    startY: currentY + 4,
    head: [['S.No', 'Company', 'Role', 'Date', 'Venue / Mode', 'Status', 'Remark']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin, bottom: 25 },
  });

  renderPDFFooters(doc, signatories, studentData?.reportId, pageWidth, pageHeight, margin);
  doc.save(`Student_History_${student.registerNo || 'History'}.pdf`);
};
