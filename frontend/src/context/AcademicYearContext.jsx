import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const AcademicYearContext = createContext(null);

export function AcademicYearProvider({ children }) {
  const { user, ready } = useAuth();
  const [academicYear, setAcademicYear] = useState(() => {
    try { return localStorage.getItem('knhs_academic_year') || null; } catch { return null; }
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user) {
      if (ready) setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchActive = api.get('/admin/academic-years/active/').catch(() => null);
    const fetchAll = api.get('/admin/academic-years/').catch(() => ({ data: [] }));

    Promise.all([fetchActive, fetchAll]).then(([activeRes, allRes]) => {
      if (cancelled) return;
      if (activeRes?.data?.name) {
        localStorage.setItem('knhs_academic_year', activeRes.data.name);
        setAcademicYear(activeRes.data.name);
      } else {
        localStorage.removeItem('knhs_academic_year');
        setAcademicYear(null);
      }
      if (allRes?.data) {
        const data = allRes.data;
        setAcademicYears(Array.isArray(data) ? data : data?.results || []);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [ready]);

  const updateAcademicYear = useCallback((year) => {
    setAcademicYear(year);
    if (year) {
      localStorage.setItem('knhs_academic_year', year);
    } else {
      localStorage.removeItem('knhs_academic_year');
    }
  }, []);

  return (
    <AcademicYearContext.Provider value={{ academicYear, academicYears, loading, setAcademicYear: updateAcademicYear }}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return ctx;
}

export default AcademicYearContext;
