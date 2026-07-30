import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useSystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/system/settings/')
      .then(r => {
        if (!cancelled) setSettings(r.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const isJHS = settings?.academic_level === 'jhs' || settings?.academic_level === 'both';
  const isSHS = settings?.academic_level === 'shs' || settings?.academic_level === 'both';

  // Number of grading periods: both JHS and SHS use 3 terms
  const gradingPeriods = 3;

  // Label: both use "Term"
  const periodLabel = 'Term';

  // Generate period options array: [{value: '1', label: '1st Term'}, ...]
  const periodOptions = [
    { value: '1', label: '1st Term' },
    { value: '2', label: '2nd Term' },
    { value: '3', label: '3rd Term' },
  ];

  // Short labels for table headers: ["T1","T2","T3"]
  const periodShortLabels = ['T1', 'T2', 'T3'];

  // Numeric values: [1,2,3]
  const periodValues = Array.from({ length: gradingPeriods }, (_, i) => i + 1);

  return {
    settings,
    loading,
    isJHS,
    isSHS,
    gradingPeriods,
    periodLabel,
    periodOptions,
    periodShortLabels,
    periodValues,
    currentQuarter: settings?.current_quarter || '1',
    defaultWeights: {
      ww: Number(settings?.default_ww_weight) || 30,
      pt: Number(settings?.default_pt_weight) || 50,
      qa: Number(settings?.default_qa_weight) || 20,
    },
    passingGrade: Number(settings?.passing_grade) || 75,
  };
}
