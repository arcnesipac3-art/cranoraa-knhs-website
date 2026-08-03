import { useState, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function useComplianceTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/types/');
      setTypes(res.data.results || res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createType = useCallback(async (data) => {
    try {
      const res = await api.post('/compliance/types/', data);
      setTypes(prev => [...prev, res.data]);
      toast.success('Compliance type created');
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
      throw err;
    }
  }, []);

  const updateType = useCallback(async (id, data) => {
    try {
      const res = await api.put(`/compliance/types/${id}/`, data);
      setTypes(prev => prev.map(t => t.id === id ? res.data : t));
      toast.success('Compliance type updated');
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
      throw err;
    }
  }, []);

  const deleteType = useCallback(async (id) => {
    try {
      await api.delete(`/compliance/types/${id}/`);
      // Backend soft-deletes (sets is_active=false), so update local state instead of removing
      setTypes(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t));
      toast.success('Compliance type deactivated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate');
      throw err;
    }
  }, []);

  return { types, loading, error, fetchTypes, createType, updateType, deleteType };
}

export function useComplianceSubmissions(params = {}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubmissions = useCallback(async (extraParams = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/submissions/', { params: { ...params, ...extraParams } });
      setSubmissions(res.data.results || res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  const createSubmission = useCallback(async (formData) => {
    try {
      const res = await api.post('/compliance/submissions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmissions(prev => [res.data, ...prev]);
      toast.success('Files uploaded');
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      throw err;
    }
  }, []);

  const submitSubmission = useCallback(async (id) => {
    try {
      const res = await api.post(`/compliance/submissions/${id}/submit/`);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'submitted', submitted_at: new Date().toISOString() } : s));
      toast.success('Submitted for review');
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
      throw err;
    }
  }, []);

  const reviewSubmission = useCallback(async (id, data) => {
    try {
      const res = await api.post(`/compliance/submissions/${id}/review/`, data);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: data.status, reviewed_at: new Date().toISOString(), remarks: data.remarks } : s));
      toast.success(`Submission ${data.status === 'reviewed' ? 'approved' : 'rejected'}`);
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to review');
      throw err;
    }
  }, []);

  const bulkReview = useCallback(async (ids, data) => {
    try {
      const res = await api.post('/compliance/submissions/bulk-review/', {
        submission_ids: ids,
        ...data,
      });
      toast.success(`${res.data.reviewed_count} submissions ${data.status === 'reviewed' ? 'approved' : 'rejected'}`);
      fetchSubmissions();
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to bulk review');
      throw err;
    }
  }, [fetchSubmissions]);

  const addComment = useCallback(async (submissionId, content) => {
    try {
      const res = await api.post(`/compliance/submissions/${submissionId}/comments/`, { content });
      toast.success('Comment added');
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add comment');
      throw err;
    }
  }, []);

  const fetchComments = useCallback(async (submissionId) => {
    try {
      const res = await api.get(`/compliance/submissions/${submissionId}/comments/`);
      return res.data;
    } catch (err) {
      toast.error('Failed to load comments');
      return [];
    }
  }, []);

  const removeFile = useCallback(async (submissionId, fileId) => {
    try {
      await api.delete(`/compliance/submissions/${submissionId}/files/${fileId}/`);
      toast.success('File removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove file');
      throw err;
    }
  }, []);

  return {
    submissions, loading, error, fetchSubmissions,
    createSubmission, submitSubmission, reviewSubmission, bulkReview,
    addComment, fetchComments, removeFile,
  };
}

export function useMyCompliance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyCompliance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/my-status/');
      setData(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchMyCompliance };
}

export function useComplianceDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/compliance/dashboard/', { params });
      setStats(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
