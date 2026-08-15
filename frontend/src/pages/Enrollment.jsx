import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import Swal from 'sweetalert2';
import { validateLRN, validateEmail, validatePhone, validateAge } from '../utils/validation';
import { EnhancedFileUpload } from '../components/enrollment/EnhancedFileUpload';
import { FieldError } from '../components/enrollment/FieldError';

const DRAFT_KEY = 'enrollment-draft';

const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
};
const saveDraft = (data) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
};
const clearDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};

const SHS_TRACKS = [
  { value: 'Academic', label: 'Academic Track' },
  { value: 'TechPro', label: 'Technical-Professional Track' },
];

const ENROLLMENT_TYPES = [
  { value: 'new', label: 'New Student', desc: 'First-time enrollment', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { value: 'returning', label: 'Returning Student', desc: 'Previously enrolled', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { value: 'transferee', label: 'Transferee', desc: 'From another school', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { value: 'sh_applicant', label: 'SHS Applicant', desc: 'Senior High School', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z' },
  { value: 'parent_assisted', label: 'Parent-Assisted', desc: 'With parent help', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
];

const TYPE_LABELS = {
  new: 'New Student', returning: 'Returning Student', transferee: 'Transferee',
  sh_applicant: 'SHS Applicant', parent_assisted: 'Parent-Assisted',
};

const STEPS = [
  { key: 'type', label: 'Type', icon: '1' },
  { key: 'personal', label: 'Personal', icon: '2' },
  { key: 'address', label: 'Address', icon: '3' },
  { key: 'parents', label: 'Parents', icon: '4' },
  { key: 'academic', label: 'Academic', icon: '5' },
  { key: 'documents', label: 'Documents', icon: '6' },
  { key: 'review', label: 'Review', icon: '7' },
];

const FileUpload = ({ label, required, file, onFile, onRemove, note }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className={`border-2 transition-all duration-200 p-4 rounded-xl ${
      dragOver ? 'border-violet-400 bg-violet-50' :
      file ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{label} {required && <span className="text-red-500">*</span>}</p>
          {note && <p className="text-[11px] text-gray-500 mt-0.5 italic">{note}</p>}
          {file && (
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              {file.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {file && (
            <button type="button" onClick={() => { onRemove(); if (inputRef.current) inputRef.current.value = ''; }}
              className="text-red-400 hover:text-red-600 p-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          <label className="cursor-pointer px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-all duration-200 rounded-lg">
            {file ? 'Change' : 'Browse'}
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
          </label>
        </div>
      </div>
      {!file && (
        <div
          className="mt-3 text-center py-3 border border-dashed border-gray-300 rounded-xl transition-colors"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <svg className="w-7 h-7 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[11px] text-gray-500 font-medium">Drag & drop or click Browse</p>
          <p className="text-[10px] text-gray-400">PDF, JPG, PNG (max 10MB)</p>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const Input = (props) => (
  <input {...props}
    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all duration-200 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500" />
);

const Select = ({ children, ...props }) => (
  <select {...props}
    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all duration-200 cursor-pointer">
    {children}
  </select>
);

const Textarea = (props) => (
  <textarea {...props}
    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all duration-200 resize-none" />
);

const Enrollment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const draft = useRef(loadDraft());
  const d = (key, fallback) => draft.current[key] || fallback;

  const [step, setStep] = useState(d('step', 0));
  const [enrollmentType, setEnrollmentType] = useState(d('enrollmentType', ''));
  const [firstName, setFirstName] = useState(d('firstName', ''));
  const [lastName, setLastName] = useState(d('lastName', ''));
  const [middleName, setMiddleName] = useState(d('middleName', ''));
  const [sex, setSex] = useState(d('sex', ''));
  const [dateOfBirth, setDateOfBirth] = useState(d('dateOfBirth', ''));
  const [placeOfBirth, setPlaceOfBirth] = useState(d('placeOfBirth', ''));
  const [nationality, setNationality] = useState(d('nationality', 'Filipino'));
  const [religion, setReligion] = useState(d('religion', ''));

  const [streetAddress, setStreetAddress] = useState(d('streetAddress', ''));
  const [barangay, setBarangay] = useState(d('barangay', ''));
  const [cityMunicipality, setCityMunicipality] = useState(d('cityMunicipality', ''));
  const [province, setProvince] = useState(d('province', ''));
  const [zipCode, setZipCode] = useState(d('zipCode', ''));

  const [fatherName, setFatherName] = useState(d('fatherName', ''));
  const [fatherOccupation, setFatherOccupation] = useState(d('fatherOccupation', ''));
  const [fatherContact, setFatherContact] = useState(d('fatherContact', ''));
  const [fatherEmail, setFatherEmail] = useState(d('fatherEmail', ''));
  const [motherName, setMotherName] = useState(d('motherName', ''));
  const [motherOccupation, setMotherOccupation] = useState(d('motherOccupation', ''));
  const [motherContact, setMotherContact] = useState(d('motherContact', ''));
  const [motherEmail, setMotherEmail] = useState(d('motherEmail', ''));
  const [guardianName, setGuardianName] = useState(d('guardianName', ''));
  const [guardianRelationship, setGuardianRelationship] = useState(d('guardianRelationship', ''));
  const [guardianContact, setGuardianContact] = useState(d('guardianContact', ''));
  const [guardianEmail, setGuardianEmail] = useState(d('guardianEmail', ''));

  const [gradeLevel, setGradeLevel] = useState(d('gradeLevel', ''));
  const [strand, setStrand] = useState(d('strand', ''));
  const [schoolYear, setSchoolYear] = useState(d('schoolYear', '2026-2027'));
  const [previousSchool, setPreviousSchool] = useState(d('previousSchool', ''));
  const [previousSchoolAddress, setPreviousSchoolAddress] = useState(d('previousSchoolAddress', ''));
  const [lrn, setLrn] = useState(d('lrn', ''));
  const [noLrn, setNoLrn] = useState(d('noLrn', false));
  const [lrnRequestReason, setLrnRequestReason] = useState(d('lrnRequestReason', ''));
  const [lrnRequestOtherText, setLrnRequestOtherText] = useState(d('lrnRequestOtherText', ''));
  const [isAls, setIsAls] = useState(d('isAls', false));

  const [email, setEmail] = useState(d('email', ''));
  const [phoneNumber, setPhoneNumber] = useState(d('phoneNumber', ''));

  const [emergencyContactName, setEmergencyContactName] = useState(d('emergencyContactName', ''));
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(d('emergencyContactRelationship', ''));
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(d('emergencyContactPhone', ''));

  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const touchField = (name) => setTouchedFields(prev => ({ ...prev, [name]: true }));

  const getValidationError = (name, value) => {
    switch (name) {
      case 'lrn': return validateLRN(value).message;
      case 'email': return validateEmail(value).message;
      case 'phoneNumber': return validatePhone(value).message;
      case 'fatherEmail': case 'motherEmail': case 'guardianEmail': case 'emergencyContactPhone':
        return name.endsWith('Email') ? validateEmail(value).message : validatePhone(value).message;
      default: return '';
    }
  };

  const onFieldBlur = (name, value) => {
    touchField(name);
    const err = getValidationError(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: err }));
  };

  const onFieldChange = (name, value, setter) => {
    setter(value);
    if (touchedFields[name]) {
      const err = getValidationError(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: err }));
    }
  };

  const [birthCertificate, setBirthCertificate] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [form138, setForm138] = useState(null);
  const [certificateOfCompletion, setCertificateOfCompletion] = useState(null);
  const [goodMoralCertificate, setGoodMoralCertificate] = useState(null);
  const [idPicture, setIdPicture] = useState(null);
  const [lastSchoolAttendedCert, setLastSchoolAttendedCert] = useState(null);

  useEffect(() => {
    saveDraft({ step, enrollmentType, firstName, lastName, middleName, sex, dateOfBirth,
      placeOfBirth, nationality, religion, streetAddress, barangay, cityMunicipality, province,
      zipCode, fatherName, fatherOccupation, fatherContact, fatherEmail, motherName,
      motherOccupation, motherContact, motherEmail, guardianName, guardianRelationship,
      guardianContact, guardianEmail, gradeLevel, strand, schoolYear, previousSchool,
      previousSchoolAddress, lrn, noLrn, lrnRequestReason, isAls, email, phoneNumber,
      emergencyContactName, emergencyContactRelationship, emergencyContactPhone });
  }, [step, enrollmentType, firstName, lastName, middleName, sex, dateOfBirth,
    placeOfBirth, nationality, religion, streetAddress, barangay, cityMunicipality, province,
    zipCode, fatherName, fatherOccupation, fatherContact, fatherEmail, motherName,
    motherOccupation, motherContact, motherEmail, guardianName, guardianRelationship,
    guardianContact, guardianEmail, gradeLevel, strand, schoolYear, previousSchool,
    previousSchoolAddress, lrn, noLrn, lrnRequestReason, isAls, email, phoneNumber,
    emergencyContactName, emergencyContactRelationship, emergencyContactPhone]);

  const isTransferee = enrollmentType === 'transferee';
  const isReturning = enrollmentType === 'returning';
  const isSHS = enrollmentType === 'sh_applicant';
  const isParentAssisted = enrollmentType === 'parent_assisted';
  const isNew = enrollmentType === 'new';

  const getAge = (dob) => {
    if (!dob) return 0;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getRequirementsForGrade = () => {
    const base = [];
    if (isSHS) {
      base.push(
        { key: 'birthCertificate', label: 'PSA Birth Certificate', required: true },
        { key: 'reportCard', label: 'Progress Report Card (Gr. 10)', required: true },
        { key: 'certificateOfCompletion', label: 'Grade 10 Completion Certificate', required: true },
      );
      if (!isReturning) base.push({ key: 'goodMoralCertificate', label: 'Good Moral Certificate', required: true });
      return base;
    }
    if (isAls) return [
      { key: 'birthCertificate', label: 'PSA Birth Certificate', required: true, note: 'If unavailable, submit Baptismal Certificate' },
      { key: 'lastSchoolAttendedCert', label: 'Certificate of Last School Year Attended', required: true },
    ];
    switch (gradeLevel) {
      case '7': return [
        { key: 'form138', label: 'Grade 6 Certificate (Form 138)', required: true },
        { key: 'birthCertificate', label: 'PSA Birth Certificate', required: true },
        { key: 'idPicture', label: 'ID Picture', required: false },
      ];
      case '11': return [
        { key: 'birthCertificate', label: 'PSA Birth Certificate', required: true },
        { key: 'reportCard', label: 'Progress Report Card', required: true },
        { key: 'certificateOfCompletion', label: 'Grade 10 Completion Certificate', required: true },
        { key: 'idPicture', label: 'ID Picture', required: false },
      ];
      default: {
        const docs = [
          { key: 'birthCertificate', label: 'PSA Birth Certificate', required: true },
        ];
        if (isTransferee || !isReturning) {
          docs.push({ key: 'reportCard', label: 'Progress Report Card', required: true });
        }
        if (isTransferee) {
          docs.push({ key: 'goodMoralCertificate', label: 'Good Moral Certificate', required: true });
        }
        docs.push({ key: 'idPicture', label: 'ID Picture', required: false });
        return docs;
      }
    }
  };

  const fileMap = { birthCertificate, reportCard, form138, certificateOfCompletion, goodMoralCertificate, idPicture, lastSchoolAttendedCert };
  const setFileMap = { birthCertificate: setBirthCertificate, reportCard: setReportCard, form138: setForm138, certificateOfCompletion: setCertificateOfCompletion, goodMoralCertificate: setGoodMoralCertificate, idPicture: setIdPicture, lastSchoolAttendedCert: setLastSchoolAttendedCert };

  const validateStep = (s) => {
    if (s === 0 && !enrollmentType) {
      Swal.fire({ icon: 'error', title: 'Required', text: 'Select an enrollment type.' });
      return false;
    }
    if (s === 1 && (!firstName || !lastName || !sex || !dateOfBirth)) {
      Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Fill in all required personal fields.' });
      return false;
    }
    if (s === 2 && (!streetAddress || !barangay || !cityMunicipality || !province)) {
      Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Fill in all required address fields.' });
      return false;
    }
    if (s === 3) {
      if (isParentAssisted && (!guardianName || !guardianRelationship || !guardianContact)) {
        Swal.fire({ icon: 'error', title: 'Missing Guardian Info', text: 'Fill in guardian fields (required for parent-assisted enrollment).' });
        return false;
      } else if (!isParentAssisted && !fatherName && !motherName) {
        Swal.fire({ icon: 'error', title: 'Missing Info', text: 'Provide at least one parent/guardian name.' });
        return false;
      }
    }
    if (s === 4) {
      if (!gradeLevel || !email || !phoneNumber || !emergencyContactName || !emergencyContactRelationship || !emergencyContactPhone) {
        Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Fill in all required academic and contact fields.' });
        return false;
      }
      if (isSHS && !['11','12'].includes(gradeLevel)) {
        Swal.fire({ icon: 'error', title: 'Invalid Grade', text: 'SHS applicants must select Grade 11 or 12.' });
        return false;
      }
      if (['11','12'].includes(gradeLevel) && !strand) {
        Swal.fire({ icon: 'error', title: 'Track Required', text: 'Select a track for SHS.' });
        return false;
      }
      if (isTransferee && !previousSchool) {
        Swal.fire({ icon: 'error', title: 'Previous School Required', text: 'Transferees must provide their previous school.' });
        return false;
      }
      if (!noLrn && (!lrn || lrn.length !== 12 || !/^\d{12}$/.test(lrn))) {
        Swal.fire({ icon: 'error', title: 'LRN Required', text: 'A valid 12-digit LRN is required. Check "No LRN" if you do not have one yet.' });
        return false;
      }
      if (noLrn && !lrnRequestReason) {
        Swal.fire({ icon: 'error', title: 'Reason Required', text: 'Please provide a reason for not having an LRN.' });
        return false;
      }
      if (noLrn && lrnRequestReason === 'other' && !lrnRequestOtherText.trim()) {
        Swal.fire({ icon: 'error', title: 'Details Required', text: 'Please describe your situation.' });
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({ icon: 'error', title: 'Invalid Email', text: 'Enter a valid email address.' });
        return false;
      }
      if (getAge(dateOfBirth) < 10) {
        Swal.fire({ icon: 'error', title: 'Age Requirement', text: 'Applicant must be at least 10 years old.' });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (loading) return;
    const requirements = getRequirementsForGrade();
    const requiredDocs = requirements.filter(r => r.required);
    const missing = requiredDocs.filter(r => !fileMap[r.key]).map(r => r.label);
    if (missing.length > 0) {
      return Swal.fire({ icon: 'error', title: 'Missing Documents', text: `Upload:\n${missing.map(f => '\u2022 ' + f).join('\n')}` });
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const fields = {
        enrollment_type: enrollmentType, school_year: schoolYear,
        first_name: firstName, last_name: lastName, middle_name: middleName,
        sex, date_of_birth: dateOfBirth, place_of_birth: placeOfBirth,
        nationality, religion, street_address: streetAddress, barangay,
        city_municipality: cityMunicipality, province, zip_code: zipCode,
        father_name: fatherName, father_occupation: fatherOccupation,
        father_contact: fatherContact, father_email: fatherEmail,
        mother_name: motherName, mother_occupation: motherOccupation,
        mother_contact: motherContact, mother_email: motherEmail,
        guardian_name: guardianName, guardian_relationship: guardianRelationship,
        guardian_contact: guardianContact, guardian_email: guardianEmail,
        grade_level: gradeLevel, strand: strand || '', previous_school: previousSchool,
        previous_school_address: previousSchoolAddress,
        lrn: noLrn ? '' : lrn, is_als: isAls, email, phone_number: phoneNumber,
        emergency_contact_name: emergencyContactName,
        emergency_contact_relationship: emergencyContactRelationship,
        emergency_contact_phone: emergencyContactPhone,
        lrn_request_reason: noLrn ? (lrnRequestReason === 'other' ? lrnRequestOtherText : lrnRequestReason) : '',
      };
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v));

      if (birthCertificate) formData.append('birth_certificate', birthCertificate);
      if (reportCard) formData.append('report_card', reportCard);
      if (form138) formData.append('form_138', form138);
      if (certificateOfCompletion) formData.append('certificate_of_completion', certificateOfCompletion);
      if (goodMoralCertificate) formData.append('good_moral_certificate', goodMoralCertificate);
      if (idPicture) formData.append('id_picture', idPicture);
      if (lastSchoolAttendedCert) formData.append('last_school_attended_cert', lastSchoolAttendedCert);

      const res = await api.post('/enrollment-applications/', formData);
      clearDraft();
      setSubmitted(res.data);
    } catch (error) {
      const data = error.response?.data;
      let msg = 'Submission failed. Please try again.';
      if (data) {
        if (typeof data.error === 'string') {
          msg = data.error;
        } else if (typeof data.error === 'object' && data.error !== null) {
          const fieldErrors = Object.entries(data.error)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join('\n');
          msg = fieldErrors || JSON.stringify(data.error);
        } else if (typeof data === 'object') {
          const fieldErrors = Object.entries(data)
            .filter(([k]) => k !== 'details')
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join('\n');
          msg = fieldErrors || JSON.stringify(data);
        }
        if (data.details?.length) {
          msg += '\n\n' + data.details.map(d => '• ' + d).join('\n');
        }
      }
      Swal.fire({ icon: 'error', title: 'Submission Failed', text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-violet-50/30 min-h-screen py-12 flex items-center">
        <div className="max-w-lg mx-auto px-4 w-full">
          <div className="bg-violet-800 text-white text-center py-5 px-6 rounded-t-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">Republic of the Philippines</p>
            <p className="text-xs font-bold uppercase tracking-wide mt-0.5">Department of Education</p>
            <h2 className="text-lg font-bold uppercase mt-1">Kiwalan National High School</h2>
          </div>
          <div className="bg-white border border-gray-200 shadow-2xl shadow-gray-200/50 p-8 text-center rounded-b-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 border-4 border-emerald-200">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h2>
            <p className="text-sm text-gray-500 mb-6">Your enrollment application has been received. Please keep your enrollment number for tracking.</p>
            {submitted?.upload_warnings && (
              <div className="bg-amber-50 border border-amber-200 p-4 mb-6 rounded-xl text-left">
                <p className="text-sm font-semibold text-amber-800 mb-1">Document Upload Issue</p>
                <p className="text-sm text-amber-700">{submitted.upload_warnings}</p>
                <p className="text-xs text-amber-600 mt-2">Please contact the registrar or resubmit with valid documents.</p>
              </div>
            )}
            <div className="bg-gray-50 border-2 border-violet-200 p-6 mb-6 rounded-xl">
              <p className="text-xs font-semibold text-violet-700 mb-1">Enrollment Reference Number</p>
              <p className="text-3xl font-bold text-gray-900 tracking-wider font-mono">{submitted.enrollment_number}</p>
              <p className="text-sm text-gray-500 mt-2">Present this number when inquiring about your application status.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to={`/track-enrollment?number=${submitted.enrollment_number}`}
                className="w-full py-3.5 bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 transition-all duration-200 rounded-lg shadow-md shadow-violet-200">
                Track Application Status
              </Link>
              <button onClick={() => navigate('/')}
                className="w-full py-3.5 border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 rounded-lg">
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-violet-50/30 min-h-screen py-8 md:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Official School Header */}
        <div className="bg-violet-800 text-white text-center py-5 px-6 rounded-t-2xl shadow-lg shadow-violet-200/50">
          <div className="flex items-center justify-center gap-3 mb-1">
            <img src="/icons/school-logo-source.png" alt="KNHS" className="w-10 h-10 object-contain" loading="lazy" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">Republic of the Philippines / Department of Education</p>
              <h1 className="text-lg font-bold uppercase tracking-tight">Kiwalan National High School</h1>
              <p className="text-[10px] text-violet-200 uppercase tracking-wide">Iligan City</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-sm font-bold uppercase tracking-widest">Enrollment Application Form</p>
            <p className="text-xs text-violet-200 mt-0.5">School Year {schoolYear}</p>
          </div>
        </div>

        {/* Track existing application */}
        <div className="bg-white border-x border-gray-200 px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Already applied? Check your application status.</p>
          <Link to="/track-enrollment" className="flex items-center gap-1.5 px-4 py-2 bg-violet-100 text-violet-800 text-xs font-semibold hover:bg-violet-200 transition-all duration-200 rounded-lg flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Track Application
          </Link>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white border-x border-gray-200 px-4 sm:px-8 pt-6 pb-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      done ? 'bg-violet-900 text-white shadow-md shadow-violet-200' :
                      active ? 'bg-white border-2 border-violet-600 text-violet-700 ring-4 ring-violet-100 shadow-sm' :
                      'bg-gray-50 border-2 border-gray-200 text-gray-400'
                    }`}>
                      {done ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : s.icon}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors ${active ? 'text-violet-700' : done ? 'text-violet-500' : 'text-gray-400'}`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1.5 mb-5 rounded-full transition-colors duration-300 ${i < step ? 'bg-violet-600' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-gray-200 shadow-xl shadow-gray-200/50 p-6 md:p-8 rounded-xl">
          {enrollmentType && step > 0 && (
            <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
              <span className="text-xs font-semibold text-violet-800">{TYPE_LABELS[enrollmentType]}</span>
              <button type="button" onClick={() => { setStep(0); setEnrollmentType(''); }} className="text-violet-400 hover:text-violet-700 transition-colors p-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Step 0: Type Selection */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 1 of 7 — Enrollment Type</h2>
                <p className="text-sm text-gray-500 mt-1">Select the category that best describes your application.</p>
              </div>
              <div className="grid gap-3">
                {ENROLLMENT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => { setEnrollmentType(t.value); if (t.value !== 'sh_applicant') setStrand(''); }}
                    className={`text-left p-4 border-2 transition-all duration-200 rounded-xl group ${
                      enrollmentType === t.value ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 bg-white'
                    }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        enrollmentType === t.value ? 'bg-violet-700 text-white shadow-lg shadow-violet-200' : 'bg-gray-100 text-gray-500 group-hover:bg-violet-100 group-hover:text-violet-600'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{t.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                      </div>
                      {enrollmentType === t.value && (
                        <svg className="w-5 h-5 text-violet-600 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 2 of 7 — Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" required><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" /></Field>
                <Field label="Last Name" required><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" /></Field>
                <Field label="Middle Name"><Input value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" /></Field>
                <Field label="Sex" required>
                  <Select value={sex} onChange={e => setSex(e.target.value)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </Field>
                <Field label="Date of Birth" required><Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} /></Field>
                <Field label="Age">
                  <Input value={getAge(dateOfBirth) || ''} disabled className="bg-slate-50 text-slate-500 font-bold" />
                  {dateOfBirth && getAge(dateOfBirth) > 0 && (
                    <p className={`text-[10px] mt-1 flex items-center gap-1 font-semibold ${
                      getAge(dateOfBirth) < 10 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {getAge(dateOfBirth) < 10 ? (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          Must be at least 10 years old
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          Age requirement met
                        </>
                      )}
                    </p>
                  )}
                </Field>
                <Field label="Place of Birth"><Input value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="City, Province" /></Field>
                <Field label="Nationality"><Input value={nationality} onChange={e => setNationality(e.target.value)} /></Field>
                <Field label="Religion"><Input value={religion} onChange={e => setReligion(e.target.value)} placeholder="Optional" /></Field>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 3 of 7 — Address Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><Field label="Street Address" required><Input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} /></Field></div>
                <Field label="Barangay" required><Input value={barangay} onChange={e => setBarangay(e.target.value)} /></Field>
                <Field label="City / Municipality" required><Input value={cityMunicipality} onChange={e => setCityMunicipality(e.target.value)} /></Field>
                <Field label="Province" required><Input value={province} onChange={e => setProvince(e.target.value)} /></Field>
                <Field label="Zip Code"><Input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Optional" /></Field>
              </div>
            </div>
          )}

          {/* Step 3: Parents */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 4 of 7 — Parent / Guardian Information</h2>
              </div>
              {isParentAssisted ? (
                <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                    <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Guardian Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Guardian's Full Name" required><Input value={guardianName} onChange={e => setGuardianName(e.target.value)} /></Field>
                    <Field label="Relationship" required><Input value={guardianRelationship} onChange={e => setGuardianRelationship(e.target.value)} placeholder="e.g. Parent, Aunt" /></Field>
                    <Field label="Contact Number" required><Input value={guardianContact} onChange={e => setGuardianContact(e.target.value)} /></Field>
                    <Field label="Email">
                      <Input type="email" value={guardianEmail}
                        onChange={e => onFieldChange('guardianEmail', e.target.value, setGuardianEmail)}
                        onBlur={() => onFieldBlur('guardianEmail', guardianEmail)}
                        placeholder="Optional"
                        className={touchedFields.guardianEmail && fieldErrors.guardianEmail ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                      <FieldError error={touchedFields.guardianEmail ? fieldErrors.guardianEmail : ''} />
                    </Field>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                    <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Father's Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Father's Name" required><Input value={fatherName} onChange={e => setFatherName(e.target.value)} /></Field>
                      <Field label="Occupation"><Input value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} placeholder="Optional" /></Field>
                      <Field label="Contact Number"><Input value={fatherContact} onChange={e => setFatherContact(e.target.value)} /></Field>
                      <Field label="Email">
                        <Input type="email" value={fatherEmail}
                          onChange={e => onFieldChange('fatherEmail', e.target.value, setFatherEmail)}
                          onBlur={() => onFieldBlur('fatherEmail', fatherEmail)}
                          placeholder="Optional"
                          className={touchedFields.fatherEmail && fieldErrors.fatherEmail ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                        <FieldError error={touchedFields.fatherEmail ? fieldErrors.fatherEmail : ''} />
                      </Field>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                    <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Mother's Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Mother's Name" required><Input value={motherName} onChange={e => setMotherName(e.target.value)} /></Field>
                      <Field label="Occupation"><Input value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} placeholder="Optional" /></Field>
                      <Field label="Contact Number"><Input value={motherContact} onChange={e => setMotherContact(e.target.value)} /></Field>
                      <Field label="Email">
                        <Input type="email" value={motherEmail}
                          onChange={e => onFieldChange('motherEmail', e.target.value, setMotherEmail)}
                          onBlur={() => onFieldBlur('motherEmail', motherEmail)}
                          placeholder="Optional"
                          className={touchedFields.motherEmail && fieldErrors.motherEmail ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                        <FieldError error={touchedFields.motherEmail ? fieldErrors.motherEmail : ''} />
                      </Field>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                    <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Guardian (if applicable)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Guardian's Name"><Input value={guardianName} onChange={e => setGuardianName(e.target.value)} /></Field>
                      <Field label="Relationship"><Input value={guardianRelationship} onChange={e => setGuardianRelationship(e.target.value)} /></Field>
                      <Field label="Contact Number"><Input value={guardianContact} onChange={e => setGuardianContact(e.target.value)} /></Field>
                      <Field label="Email">
                        <Input type="email" value={guardianEmail}
                          onChange={e => onFieldChange('guardianEmail', e.target.value, setGuardianEmail)}
                          onBlur={() => onFieldBlur('guardianEmail', guardianEmail)}
                          placeholder="Optional"
                          className={touchedFields.guardianEmail && fieldErrors.guardianEmail ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                        <FieldError error={touchedFields.guardianEmail ? fieldErrors.guardianEmail : ''} />
                      </Field>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Academic */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 5 of 7 — Academic & Contact Information</h2>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Academic Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Grade Level" required>
                    <Select value={gradeLevel} onChange={e => { setGradeLevel(e.target.value); if (!['11','12'].includes(e.target.value)) setStrand(''); }}>
                      <option value="">Select Grade</option>
                      {isSHS ? ['11','12'].map(g => <option key={g} value={g}>Grade {g}</option>) :
                        ['7','8','9','10','11','12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </Select>
                  </Field>
                  {['11','12'].includes(gradeLevel) && (
                    <Field label="Track" required>
                      <Select value={strand} onChange={e => setStrand(e.target.value)}>
                        <option value="">Select Track</option>
                        {SHS_TRACKS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </Select>
                    </Field>
                  )}
                  <Field label="School Year" required>
                    <Select value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                    </Select>
                  </Field>
                  <Field label="LRN (Learner Reference Number)" required={!noLrn}>
                    <Input value={lrn} onChange={e => onFieldChange('lrn', e.target.value, setLrn)}
                      onBlur={() => onFieldBlur('lrn', lrn)}
                      placeholder="12-digit LRN" disabled={noLrn}
                      className={`${noLrn ? 'bg-slate-100 text-slate-400' : ''} ${
                        touchedFields.lrn && fieldErrors.lrn ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''
                      }`} />
                    <FieldError error={touchedFields.lrn ? fieldErrors.lrn : ''} />
                    {!noLrn && lrn && !fieldErrors.lrn && lrn.length === 12 && (
                      <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Valid LRN format
                      </p>
                    )}
                  </Field>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={noLrn} onChange={e => { setNoLrn(e.target.checked); if (e.target.checked) setLrn(''); }}
                        className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
                      <span className="text-sm text-slate-700 font-medium">I do not have an LRN yet</span>
                    </label>
                    {noLrn && (
                      <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                        <p className="text-xs text-amber-700 font-medium">
                          No LRN? You can still apply. The school will assist you in obtaining one. Please provide a reason:
                        </p>
                        <Field label="Reason for no LRN" required>
                          <Select value={lrnRequestReason} onChange={e => setLrnRequestReason(e.target.value)}>
                            <option value="">Select reason</option>
                            <option value="new_student">New student, never enrolled in DepEd</option>
                            <option value="lost_lrn">LRN was lost or forgotten</option>
                            <option value="als_graduate">ALS graduate, no LRN issued</option>
                            <option value="transferee_no_lrn">Transferee from private school, no LRN</option>
                            <option value="other">Other reason</option>
                          </Select>
                        </Field>
                        {lrnRequestReason === 'other' && (
                          <Field label="Please specify">
                            <Input value={lrnRequestOtherText} onChange={e => setLrnRequestOtherText(e.target.value)} placeholder="Describe your situation" />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Previous School" required={isTransferee}>
                      <Input value={previousSchool} onChange={e => setPreviousSchool(e.target.value)} placeholder={isTransferee ? 'Required for transferees' : 'Optional'} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Previous School Address"><Textarea rows={2} value={previousSchoolAddress} onChange={e => setPreviousSchoolAddress(e.target.value)} placeholder="Optional" /></Field>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isAls} onChange={e => setIsAls(e.target.checked)} className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500" />
                      <span className="text-sm text-slate-700 font-medium">Alternative Learning System (ALS) applicant</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Contact Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email" required>
                    <Input type="email" value={email}
                      onChange={e => onFieldChange('email', e.target.value, setEmail)}
                      onBlur={() => onFieldBlur('email', email)}
                      className={touchedFields.email && fieldErrors.email ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                    <FieldError error={touchedFields.email ? fieldErrors.email : ''} />
                  </Field>
                  <Field label="Phone Number" required>
                    <Input value={phoneNumber}
                      onChange={e => onFieldChange('phoneNumber', e.target.value, setPhoneNumber)}
                      onBlur={() => onFieldBlur('phoneNumber', phoneNumber)}
                      placeholder="09XX XXX XXXX"
                      className={touchedFields.phoneNumber && fieldErrors.phoneNumber ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                    <FieldError error={touchedFields.phoneNumber ? fieldErrors.phoneNumber : ''} />
                  </Field>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-2">Emergency Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Name" required><Input value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} /></Field>
                  <Field label="Relationship" required><Input value={emergencyContactRelationship} onChange={e => setEmergencyContactRelationship(e.target.value)} /></Field>
                  <div className="sm:col-span-2">
                  <Field label="Phone Number" required>
                    <Input value={emergencyContactPhone}
                      onChange={e => onFieldChange('emergencyContactPhone', e.target.value, setEmergencyContactPhone)}
                      onBlur={() => onFieldBlur('emergencyContactPhone', emergencyContactPhone)}
                      className={touchedFields.emergencyContactPhone && fieldErrors.emergencyContactPhone ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : ''} />
                    <FieldError error={touchedFields.emergencyContactPhone ? fieldErrors.emergencyContactPhone : ''} />
                  </Field>
                </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 6 of 7 — Document Requirements</h2>
              </div>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-amber-800">
                  Requirements for <strong>{TYPE_LABELS[enrollmentType]}</strong>
                  {!isSHS && gradeLevel && !isAls ? ` / Grade ${gradeLevel}` : ''}
                  {isAls ? ' / ALS' : ''}. Upload clear, legible copies (PDF, JPG, or PNG, max 10MB each).
                </p>
              </div>
              <div className="space-y-3">
                {getRequirementsForGrade().map(req => (
                  <EnhancedFileUpload key={req.key} label={req.label} required={req.required} note={req.note}
                    file={fileMap[req.key]} onFile={f => setFileMap[req.key](f)} onRemove={() => setFileMap[req.key](null)} />
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Step 7 of 7 — Review & Submit</h2>
                <p className="text-sm text-gray-500 mt-1">Please verify all information before submitting.</p>
              </div>

              <ReviewSection title="Enrollment Type">
                <ReviewRow label="Type" value={TYPE_LABELS[enrollmentType]} />
                <ReviewRow label="School Year" value={schoolYear} />
              </ReviewSection>

              <ReviewSection title="Personal Information">
                <ReviewRow label="Full Name" value={`${lastName}, ${firstName} ${middleName || ''}`} />
                <ReviewRow label="Sex" value={sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : 'Other'} />
                <ReviewRow label="Date of Birth" value={dateOfBirth} />
                <ReviewRow label="Age" value={getAge(dateOfBirth)} />
                <ReviewRow label="Place of Birth" value={placeOfBirth || 'N/A'} />
                <ReviewRow label="Nationality" value={nationality} />
                <ReviewRow label="Religion" value={religion || 'N/A'} />
              </ReviewSection>

              <ReviewSection title="Address">
                <ReviewRow label="Street" value={streetAddress} />
                <ReviewRow label="Barangay" value={barangay} />
                <ReviewRow label="City" value={cityMunicipality} />
                <ReviewRow label="Province" value={province} />
                <ReviewRow label="Zip" value={zipCode || 'N/A'} />
              </ReviewSection>

              <ReviewSection title="Parents / Guardian">
                {fatherName && <ReviewRow label="Father" value={`${fatherName} ${fatherContact ? `- ${fatherContact}` : ''}`} />}
                {motherName && <ReviewRow label="Mother" value={`${motherName} ${motherContact ? `- ${motherContact}` : ''}`} />}
                {guardianName && <ReviewRow label="Guardian" value={`${guardianName} (${guardianRelationship}) ${guardianContact ? `- ${guardianContact}` : ''}`} />}
              </ReviewSection>

              <ReviewSection title="Academic">
                <ReviewRow label="Grade Level" value={`Grade ${gradeLevel}${strand ? ` / ${strand}` : ''}`} />
                <ReviewRow label="LRN" value={noLrn ? `Not available (${lrnRequestReason === 'other' ? lrnRequestOtherText || 'Other' : lrnRequestReason.replace(/_/g, ' ')})` : (lrn || 'N/A')} />
                <ReviewRow label="Previous School" value={previousSchool || 'N/A'} />
                <ReviewRow label="ALS Applicant" value={isAls ? 'Yes' : 'No'} />
              </ReviewSection>

              <ReviewSection title="Contact">
                <ReviewRow label="Email" value={email} />
                <ReviewRow label="Phone" value={phoneNumber} />
                <ReviewRow label="Emergency Contact" value={`${emergencyContactName} (${emergencyContactRelationship}) ${emergencyContactPhone}`} />
              </ReviewSection>

              <ReviewSection title="Documents">
                {getRequirementsForGrade().map(req => {
                  const f = fileMap[req.key];
                  return <ReviewRow key={req.key} label={req.label} value={f ? 'Uploaded' : (req.required ? 'Missing' : 'Not provided')} />;
                })}
              </ReviewSection>

              <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                <p className="text-sm text-violet-800">
                  <strong>Declaration:</strong> I hereby certify that all information provided in this application form is true and correct to the best of my knowledge. I understand that providing false information may result in the cancellation of my enrollment.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-200">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            ) : <div />}
            {step < 6 ? (
              <button type="button" onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 active:scale-[0.98] transition-all duration-200 rounded-lg shadow-md shadow-violet-200">
                Next Step
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] transition-all duration-200 rounded-lg shadow-md shadow-emerald-200">
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-violet-800 text-center py-3 rounded-b-2xl">
          <p className="text-xs text-violet-200">
            {new Date().getFullYear()} Kiwalan National High School / Department of Education / Republic of the Philippines
          </p>
        </div>
      </div>
    </div>
  );
};

const ReviewSection = ({ title, children }) => (
  <div className="border border-gray-200 bg-white rounded-xl overflow-hidden">
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
    </div>
    <div className="px-4 py-3 space-y-2.5">{children}</div>
  </div>
);

const ReviewRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
    <span className="text-gray-500 font-medium text-xs">{label}</span>
    <span className="text-gray-900 font-semibold text-right text-xs">{value}</span>
  </div>
);

export default Enrollment;
