export const OFFICIAL_DEPARTMENTS = [
  { code: 'AI & DS', name: 'Artificial Intelligence and Data Science', isActive: true },
  { code: 'CSE', name: 'Computer Science and Engineering', isActive: true },
  { code: 'ECE', name: 'Electronics and Communication Engineering', isActive: true },
  { code: 'EEE', name: 'Electrical and Electronics Engineering', isActive: true },
  { code: 'MECH', name: 'Mechanical Engineering', isActive: true },
  { code: 'CIVIL', name: 'Civil Engineering', isActive: true },
  { code: 'MBA', name: 'Master of Business Administration', isActive: true },
];

// Helper to normalize input department string to official department name or code
export const normalizeDepartment = (input) => {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Exact match by name or code
  for (const dept of OFFICIAL_DEPARTMENTS) {
    if (dept.name.toLowerCase() === lower || dept.code.toLowerCase() === lower) {
      return dept.name;
    }
  }

  // Common alias matching
  if (lower.includes('cse') || lower.includes('computer science')) return 'Computer Science and Engineering';
  if (lower.includes('ai') || lower.includes('data science') || lower.includes('aids')) return 'Artificial Intelligence and Data Science';
  if (lower.includes('ece') || lower.includes('electronics and communication')) return 'Electronics and Communication Engineering';
  if (lower.includes('eee') || lower.includes('electrical')) return 'Electrical and Electronics Engineering';
  if (lower.includes('mech') || lower.includes('mechanical')) return 'Mechanical Engineering';
  if (lower.includes('civil')) return 'Civil Engineering';
  if (lower.includes('mba') || lower.includes('business administration') || lower.includes('management')) return 'Master of Business Administration';

  return trimmed;
};

// Check if student's department matches allowed departments list (handles both code and name matching)
export const matchesAllowedDepartment = (studentDept, allowedList) => {
  if (!allowedList || allowedList.length === 0) return true;
  if (!studentDept) return false;

  const normalizedStudent = normalizeDepartment(studentDept);

  return allowedList.some((allowed) => {
    const normalizedAllowed = normalizeDepartment(allowed);
    return (
      normalizedAllowed.toLowerCase() === normalizedStudent.toLowerCase() ||
      allowed.toLowerCase() === studentDept.toLowerCase()
    );
  });
};
