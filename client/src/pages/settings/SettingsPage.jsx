import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Upload,
  Image as ImageIcon,
  Check,
  Shield,
  Download,
  FileCheck,
  PenTool,
  GraduationCap,
  FileText,
  Printer,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { OFFICIAL_DEPARTMENTS } from '../../config/departments';

export const SettingsPage = () => {
  const { addToast, pinRequired, reloadSettings } = useApp();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [branding, setBranding] = useState({
    headerMode: 'banner', // 'banner' | 'full_page' | 'preprinted' | 'custom'
    collegeName: '',
    address: '',
    email: '',
    phone: '',
    logo: '',
    letterheadImage: '',
    fullPageLetterhead: '',
    preprintedMarginTop: 45,
  });

  const [signatories, setSignatories] = useState({
    officer: '',
    coordinator: '',
    principal: '',
  });

  const [defaultOrientation, setDefaultOrientation] = useState('portrait');

  const [departments, setDepartments] = useState(OFFICIAL_DEPARTMENTS);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [showAddDept, setShowAddDept] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setFetching(true);
      try {
        const res = await api.getSettings();
        if (res.settings) {
          if (res.settings.college_branding) {
            const cb = res.settings.college_branding;
            setBranding({
              headerMode: cb.headerMode === 'letterhead' ? 'banner' : cb.headerMode || (cb.fullPageLetterhead ? 'full_page' : cb.letterheadImage ? 'banner' : 'custom'),
              collegeName: cb.collegeName || '',
              address: cb.address || '',
              email: cb.email || '',
              phone: cb.phone || '',
              logo: cb.logo || '',
              letterheadImage: cb.letterheadImage || '',
              fullPageLetterhead: cb.fullPageLetterhead || '',
              preprintedMarginTop: cb.preprintedMarginTop !== undefined ? cb.preprintedMarginTop : 45,
            });
          }
          if (res.settings.report_signatories) {
            setSignatories(res.settings.report_signatories);
          }
          if (res.settings.default_orientation) {
            setDefaultOrientation(res.settings.default_orientation);
          }
          if (res.settings.official_departments && Array.isArray(res.settings.official_departments) && res.settings.official_departments.length > 0) {
            setDepartments(res.settings.official_departments);
          }
        }
      } catch (err) {
        addToast('Failed to load settings', 'error');
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, [addToast]);

  // Handle Logo Upload as Base64 (for Custom Header mode)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast('Logo file size must be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBranding((prev) => ({ ...prev, logo: event.target.result }));
      addToast('College logo loaded', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Handle Full Letterhead Banner Image Upload as Base64
  const handleLetterheadUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Letterhead banner image size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBranding((prev) => ({
        ...prev,
        letterheadImage: event.target.result,
        headerMode: 'banner',
      }));
      addToast('Official letterhead banner loaded successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle Complete A4 Full Letterhead Page Template Upload as Base64
  const handleFullPageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      addToast('Full page letterhead template must be less than 8MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setBranding((prev) => ({
        ...prev,
        fullPageLetterhead: event.target.result,
        headerMode: 'full_page',
      }));
      addToast('Full A4 letter page template loaded successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleToggleDept = (code) => {
    setDepartments((prev) =>
      prev.map((d) => (d.code === code ? { ...d, isActive: d.isActive === false ? true : false } : d))
    );
  };

  const handleAddDept = (e) => {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) {
      addToast('Please provide both department code and name', 'warning');
      return;
    }
    const codeUpper = newDeptCode.trim().toUpperCase();
    if (departments.some((d) => d.code.toUpperCase() === codeUpper)) {
      addToast(`Department code '${codeUpper}' already exists`, 'error');
      return;
    }
    setDepartments((prev) => [
      ...prev,
      { code: codeUpper, name: newDeptName.trim(), isActive: true },
    ]);
    setNewDeptCode('');
    setNewDeptName('');
    setShowAddDept(false);
    addToast(`Added department: ${codeUpper}`, 'success');
  };

  const handleRemoveDept = (code) => {
    setDepartments((prev) => prev.filter((d) => d.code !== code));
    addToast(`Removed department ${code}`, 'info');
  };

  const handleResetDepts = () => {
    setDepartments(OFFICIAL_DEPARTMENTS);
    addToast('Reset academic departments to default list', 'info');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateSettings({
        college_branding: branding,
        report_signatories: signatories,
        default_orientation: defaultOrientation,
        official_departments: departments,
      });
      if (reloadSettings) {
        await reloadSettings();
      }
      addToast('Settings saved successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System & Report Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure college branding, logo, official signatories, and report orientations
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: College Branding & Letterhead */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  College Branding & Letterhead Header
                </h2>
                <p className="text-xs text-slate-500">
                  Choose how your college header appears on official placement attendance sheets and PDF reports
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex flex-wrap items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setBranding({ ...branding, headerMode: 'banner' })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  branding.headerMode === 'banner'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                Header Banner
              </button>

              <button
                type="button"
                onClick={() => setBranding({ ...branding, headerMode: 'full_page' })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  branding.headerMode === 'full_page'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Full Letter Page
              </button>

              <button
                type="button"
                onClick={() => setBranding({ ...branding, headerMode: 'preprinted' })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  branding.headerMode === 'preprinted'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-amber-500" />
                Pre-Printed Paper
              </button>

              <button
                type="button"
                onClick={() => setBranding({ ...branding, headerMode: 'custom' })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  branding.headerMode === 'custom'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-emerald-500" />
                Structured Details
              </button>
            </div>
          </div>

          {/* MODE 1: HEADER BANNER IMAGE (Wide top banner like Mar Ephraem) */}
          {branding.headerMode === 'banner' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-primary-50/70 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-xs text-primary-900 dark:text-primary-300 flex items-start gap-2.5">
                <ImageIcon className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Official Header Banner Mode:</span> Upload a pre-designed top institutional letterhead banner image (with emblem, college name, NAAC/NBA accreditations, and affiliation). This will be printed across the top of all placement attendance reports.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Official Letterhead Banner Image (PNG, JPG, WebP • Max 5MB)
                </label>

                {branding.letterheadImage ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col items-center justify-center">
                      <div className="w-full flex items-center justify-center py-2">
                        <img
                          src={branding.letterheadImage}
                          alt="Official College Letterhead"
                          className="max-h-36 w-auto max-w-full object-contain"
                        />
                      </div>
                      <div className="w-full mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Live Report Header Preview • Automatically scales to A4 Report width
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Replace Banner Image
                        <input type="file" onChange={handleLetterheadUpload} accept="image/*" className="hidden" />
                      </label>

                      <button
                        type="button"
                        onClick={() => setBranding({ ...branding, letterheadImage: '' })}
                        className="text-xs text-rose-500 hover:underline font-medium"
                      >
                        Remove Banner Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      const input = document.getElementById('letterhead-upload-input');
                      if (input) input.click();
                    }}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 group"
                  >
                    <input
                      id="letterhead-upload-input"
                      type="file"
                      onChange={handleLetterheadUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-inner">
                      <Upload className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to upload institutional letterhead banner
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      PNG, JPG, WebP or SVG up to 5MB (e.g. Mar Ephraem College letterhead)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: FULL A4 LETTER PAGE TEMPLATE (Entire page background) */}
          {branding.headerMode === 'full_page' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Full A4 Letter Page Template Active:</span> Upload a complete A4 letterhead page template (with borders, college crest, watermark, and footer). When printing or downloading PDFs, attendance sheets are placed directly onto this full letterhead page background.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Complete A4 Letterhead Page Template (PNG, JPG, WebP • Max 8MB)
                </label>

                {branding.fullPageLetterhead ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex justify-center">
                      <div className="w-56 h-80 bg-white rounded-lg shadow-lg border border-slate-300 overflow-hidden relative p-2 flex flex-col justify-between">
                        <img
                          src={branding.fullPageLetterhead}
                          alt="Full Letterhead Template"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        <div className="relative z-10 bg-white/70 backdrop-blur-xs rounded p-1.5 text-[9px] text-slate-600 font-mono text-center">
                          Full A4 Page Template
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        Replace Full Page Template
                        <input type="file" onChange={handleFullPageUpload} accept="image/*" className="hidden" />
                      </label>

                      <button
                        type="button"
                        onClick={() => setBranding({ ...branding, fullPageLetterhead: '' })}
                        className="text-xs text-rose-500 hover:underline font-medium"
                      >
                        Remove Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      const input = document.getElementById('full-page-upload-input');
                      if (input) input.click();
                    }}
                    className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-indigo-50/20 dark:bg-indigo-950/20 group"
                  >
                    <input
                      id="full-page-upload-input"
                      type="file"
                      onChange={handleFullPageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-inner">
                      <FileText className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to upload complete A4 letterhead page template
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      Full-bleed A4 template image (PNG, JPG, WebP up to 8MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: PRE-PRINTED PHYSICAL LETTERHEAD STATIONERY */}
          {branding.headerMode === 'preprinted' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                <Printer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Pre-Printed Letterhead Stationery Mode Active:</span> Feed your official pre-printed college letterhead paper directly into your printer tray. The digital header is suppressed, reserving a blank top margin so attendance tables print cleanly under your pre-printed letterhead.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Top Margin Reserved for Pre-Printed Header (mm)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="100"
                    value={branding.preprintedMarginTop}
                    onChange={(e) => setBranding({ ...branding, preprintedMarginTop: Number(e.target.value) || 45 })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard college letterheads typically require 40mm to 55mm of clearance.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    College / Institution Name (For filenames & audit logs)
                  </label>
                  <input
                    type="text"
                    value={branding.collegeName}
                    onChange={(e) => setBranding({ ...branding, collegeName: e.target.value })}
                    placeholder="e.g. Mar Ephraem College of Engineering and Technology"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Graphic illustration of preprinted stationery */}
              <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20 text-center">
                <span className="text-xs font-mono font-semibold text-amber-800 dark:text-amber-400">
                  [ Blank top space of {branding.preprintedMarginTop || 45}mm reserved for physical letterhead paper ]
                </span>
              </div>
            </div>
          )}

          {/* MODE 4: STRUCTURED DETAILS + EMBLEM */}
          {branding.headerMode === 'custom' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    College / Institution Name
                  </label>
                  <input
                    type="text"
                    value={branding.collegeName}
                    onChange={(e) => setBranding({ ...branding, collegeName: e.target.value })}
                    placeholder="e.g. National Institute of Technology & Engineering"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Campus Address
                  </label>
                  <input
                    type="text"
                    value={branding.address}
                    onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                    placeholder="e.g. University Campus, Placement Division, Knowledge City - 560001"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Placement Cell Email
                  </label>
                  <input
                    type="email"
                    value={branding.email}
                    onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                    placeholder="placements@college.edu"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={branding.phone}
                    onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                    placeholder="+91 80 2345 6789"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo Upload Box */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institution Emblem / Logo (PNG, JPG, SVG)
                </label>
                <div className="flex items-center gap-4">
                  {branding.logo ? (
                    <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white flex items-center justify-center overflow-hidden shrink-0">
                      <img src={branding.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Choose Emblem
                      <input type="file" onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    </label>
                    {branding.logo && (
                      <button
                        type="button"
                        onClick={() => setBranding({ ...branding, logo: '' })}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        Remove Emblem
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Official Signatories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <PenTool className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Report Signatures & Authorizations
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Signatory 1: Placement Officer
              </label>
              <input
                type="text"
                value={signatories.officer}
                onChange={(e) => setSignatories({ ...signatories, officer: e.target.value })}
                placeholder="Prof. Alan Turing (Placement Officer)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Signatory 2: Drive Coordinator
              </label>
              <input
                type="text"
                value={signatories.coordinator}
                onChange={(e) => setSignatories({ ...signatories, coordinator: e.target.value })}
                placeholder="Dr. Grace Hopper (Coordinator)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Signatory 3: Principal / HOD
              </label>
              <input
                type="text"
                value={signatories.principal}
                onChange={(e) => setSignatories({ ...signatories, principal: e.target.value })}
                placeholder="Dr. John von Neumann (Principal)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Official Academic Departments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Academic Departments ({departments.length} Configured)
                </h2>
                <p className="text-xs text-slate-500">
                  Branches recognized for placement drives, student profiles, eligibility filters, and PDF reports
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDepts}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                title="Reset to official 7 departments"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowAddDept((v) => !v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddDept ? 'Close' : 'Add Department'}
              </button>
            </div>
          </div>

          {/* Inline Add Department Form */}
          {showAddDept && (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Register New Academic Department
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code (e.g. IT, BIOTECH, BME)
                  </label>
                  <input
                    type="text"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    placeholder="IT"
                    className="w-full px-3 py-1.5 text-xs font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Department Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="Information Technology"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddDept}
                      className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept) => {
              const isActive = dept.isActive !== false;
              return (
                <div
                  key={dept.code}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isActive
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                      : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/40 opacity-60'
                  }`}
                >
                  <div className="px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-mono font-bold text-xs shrink-0">
                    {dept.code}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                      {dept.name}
                    </h4>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleDept(dept.code)}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400 hover:underline'
                            : 'text-slate-400 hover:underline'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveDept(dept.code)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title={`Remove ${dept.code}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Default Print Orientation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Default PDF Report Orientation
            </h3>
            <p className="text-xs text-slate-500">
              Standard orientation applied to all attendance sheets and PDF downloads
            </p>
          </div>

          <select
            value={defaultOrientation}
            onChange={(e) => setDefaultOrientation(e.target.value)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="portrait">A4 Portrait (Recommended)</option>
            <option value="landscape">A4 Landscape</option>
          </select>
        </div>

        {/* Section 4: Data Backup & Access Security */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Complete Database Backup
            </h3>
            <p className="text-xs text-slate-500">
              Export all students, placement drives, assignments, and attendance records as JSON stream
            </p>
          </div>

          <button
            type="button"
            onClick={() => api.exportAllBackup()}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Full Backup
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/25 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              'Saving Settings...'
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save All Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
