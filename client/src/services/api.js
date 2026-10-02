// Unified API Client for Placement Drive Attendance System

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const getStoredToken = () => {
  return localStorage.getItem('attendrive_token') || sessionStorage.getItem('attendrive_token') || '';
};

export const setStoredToken = (token, remember = true) => {
  if (token) {
    if (remember) {
      localStorage.setItem('attendrive_token', token);
      sessionStorage.removeItem('attendrive_token');
    } else {
      sessionStorage.setItem('attendrive_token', token);
      localStorage.removeItem('attendrive_token');
    }
  } else {
    localStorage.removeItem('attendrive_token');
    sessionStorage.removeItem('attendrive_token');
  }
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('attendrive_user') || sessionStorage.getItem('attendrive_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user, remember = true) => {
  if (user) {
    if (remember) {
      localStorage.setItem('attendrive_user', JSON.stringify(user));
      sessionStorage.removeItem('attendrive_user');
    } else {
      sessionStorage.setItem('attendrive_user', JSON.stringify(user));
      localStorage.removeItem('attendrive_user');
    }
  } else {
    localStorage.removeItem('attendrive_user');
    sessionStorage.removeItem('attendrive_user');
  }
};

export const clearAuth = () => {
  localStorage.removeItem('attendrive_token');
  localStorage.removeItem('attendrive_user');
  sessionStorage.removeItem('attendrive_token');
  sessionStorage.removeItem('attendrive_user');
};

export const getStoredPin = () => {
  return sessionStorage.getItem('attendrive_pin') || '';
};

export const setStoredPin = (pin) => {
  if (pin) {
    sessionStorage.setItem('attendrive_pin', pin);
  } else {
    sessionStorage.removeItem('attendrive_pin');
  }
};

const getHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const pin = getStoredPin();
  if (pin) {
    headers['x-access-pin'] = pin;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.errors = data.errors;
    error.pinRequired = data.pinRequired || response.status === 401;
    throw error;
  }
  return data;
};

export const api = {
  // Authentication & User Profile
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },
  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },
  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  updateProfile: async (data) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Auth & PIN Status
  getAuthStatus: async () => {
    const res = await fetch(`${API_BASE}/auth/status`);
    return handleResponse(res);
  },
  verifyPin: async (pin) => {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    return handleResponse(res);
  },

  // Students CRUD & Bulk
  getStudents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/students?${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getStudentById: async (id) => {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  createStudent: async (studentData) => {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(studentData),
    });
    return handleResponse(res);
  },
  updateStudent: async (id, studentData) => {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(studentData),
    });
    return handleResponse(res);
  },
  deleteStudent: async (id) => {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  checkDuplicates: async (registerNos) => {
    const res = await fetch(`${API_BASE}/students/check-duplicates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ registerNos }),
    });
    return handleResponse(res);
  },
  bulkImportStudents: async (students, conflictMode = 'skip') => {
    const res = await fetch(`${API_BASE}/students/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ students, conflictMode }),
    });
    return handleResponse(res);
  },
  bulkEditStudents: async (studentIds, updates) => {
    const res = await fetch(`${API_BASE}/students/bulk`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ studentIds, ...updates }),
    });
    return handleResponse(res);
  },
  bulkDeleteStudents: async (payload) => {
    const res = await fetch(`${API_BASE}/students/bulk`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Drives CRUD & Bulk
  getDrives: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/drives?${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getDriveById: async (id) => {
    const res = await fetch(`${API_BASE}/drives/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  createDrive: async (driveData) => {
    const res = await fetch(`${API_BASE}/drives`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(driveData),
    });
    return handleResponse(res);
  },
  updateDrive: async (id, driveData) => {
    const res = await fetch(`${API_BASE}/drives/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(driveData),
    });
    return handleResponse(res);
  },
  deleteDrive: async (id) => {
    const res = await fetch(`${API_BASE}/drives/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  bulkCreateDrives: async (drives) => {
    const res = await fetch(`${API_BASE}/drives/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ drives }),
    });
    return handleResponse(res);
  },

  // Drive Assignments & Eligibility
  getEligiblePreview: async (driveId) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/eligible`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  autoAssignEligible: async (driveId) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/assign/auto`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  bulkAssignStudents: async (driveId, payload) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/assign/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
  getDriveAssignments: async (driveId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/drives/${driveId}/assignments?${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  bulkRemoveAssignments: async (driveId, payload) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/assign/bulk`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
  assignStudentToMultipleDrives: async (studentId, driveIds, allowIneligible = false) => {
    const res = await fetch(`${API_BASE}/drives/students/${studentId}/assign-multiple`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ driveIds, allowIneligible }),
    });
    return handleResponse(res);
  },

  // Attendance Marking & Finalize
  getDriveAttendance: async (driveId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/drives/${driveId}/attendance?${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  rapidScanAttendance: async (driveId, payload) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/attendance/rapid-scan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
  bulkUpdateAttendance: async (driveId, payload) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/attendance/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
  markAllAttendance: async (driveId, status = 'Present') => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/attendance/mark-all`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },
  pastePresentRegisterNos: async (driveId, registerNos, commit = true) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/attendance/paste-present`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ registerNos, commit }),
    });
    return handleResponse(res);
  },
  finalizeAttendance: async (driveId) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/finalize`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  unlockAttendance: async (driveId) => {
    const res = await fetch(`${API_BASE}/drives/${driveId}/unlock`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Reports API
  getDriveReport: async (driveId) => {
    const res = await fetch(`${API_BASE}/reports/drive/${driveId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getAbsenteesReport: async (driveId) => {
    const res = await fetch(`${API_BASE}/reports/absentees/${driveId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getStudentHistoryReport: async (studentId) => {
    const res = await fetch(`${API_BASE}/reports/student-history/${studentId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getDepartmentSummaryReport: async () => {
    const res = await fetch(`${API_BASE}/reports/department-summary`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getConsolidatedReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/consolidated?${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getReportHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/history?${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Settings API
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  updateSettings: async (settingsData) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settingsData),
    });
    return handleResponse(res);
  },
  exportAllBackup: () => {
    const token = getStoredToken();
    const url = token ? `${API_BASE}/export/all?token=${encodeURIComponent(token)}` : `${API_BASE}/export/all`;
    window.open(url, '_blank');
  },

  // Templates
  downloadTemplate: (type) => {
    const token = getStoredToken();
    const url = token ? `${API_BASE}/templates/${type}?token=${encodeURIComponent(token)}` : `${API_BASE}/templates/${type}`;
    window.open(url, '_blank');
  },

  // Undo Import
  undoImport: async (importLogId) => {
    const res = await fetch(`${API_BASE}/imports/${importLogId}/undo`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
  getRecentImports: async () => {
    const res = await fetch(`${API_BASE}/imports/recent`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};
