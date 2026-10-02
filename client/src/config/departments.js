export const OFFICIAL_DEPARTMENTS = [
  { code: 'AI & DS', name: 'Artificial Intelligence and Data Science', isActive: true },
  { code: 'CSE', name: 'Computer Science and Engineering', isActive: true },
  { code: 'ECE', name: 'Electronics and Communication Engineering', isActive: true },
  { code: 'EEE', name: 'Electrical and Electronics Engineering', isActive: true },
  { code: 'MECH', name: 'Mechanical Engineering', isActive: true },
  { code: 'CIVIL', name: 'Civil Engineering', isActive: true },
  { code: 'MBA', name: 'Master of Business Administration', isActive: true },
];

export const getDepartmentByCodeOrName = (val) => {
  if (!val) return null;
  const lower = String(val).trim().toLowerCase();
  return OFFICIAL_DEPARTMENTS.find(
    (d) => d.code.toLowerCase() === lower || d.name.toLowerCase() === lower
  );
};
