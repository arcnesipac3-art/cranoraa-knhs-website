import { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import AcademicYearContext from '../context/AcademicYearContext';

export function useActiveAcademicYear() {
  const ctx = useContext(AcademicYearContext);

  // Fallback for pages not yet wrapped in AcademicYearProvider
  const [academicYear, setAcademicYear] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return undefined;

    let cancelled = false;
    api.get('/admin/academic-years/active/')
      .then(r => {
        if (cancelled) return;
        const year = r.data.name;
        localStorage.setItem('knhs_academic_year', year);
        setAcademicYear(year);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem('knhs_academic_year');
          setAcademicYear(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ctx]);

  // If inside a provider, use shared state
  if (ctx) {
    return { academicYear: ctx.academicYear, loading: ctx.loading, setAcademicYear: ctx.setAcademicYear };
  }

  return { academicYear, loading, setAcademicYear };
}
