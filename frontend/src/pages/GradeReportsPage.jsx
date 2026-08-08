import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardBody, Button,
  EmptyState, Skeleton,
} from '../components/ui';

const REPORT_TYPES = [
  { id: 'submission', label: 'Teacher Submission Report', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'missing', label: 'Missing Grades Report', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  { id: 'late', label: 'Late Submission Report', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'completion', label: 'Completion Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

const ReportCard = ({ report, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
  >
    <div className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-brand-100 text-brand-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
          </svg>
        </div>
        <h4 className="font-semibold text-gray-900">{report.label}</h4>
      </div>
      <p className="text-sm text-gray-500">Generate and export {report.label.toLowerCase()}</p>
    </div>
  </motion.div>
);

const SubmissionReportTable = ({ data }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data.map((row) => (
          <tr key={row.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
            <td className="px-4 py-3 text-sm">{row.total_classes}</td>
            <td className="px-4 py-3 text-sm text-green-600">{row.submitted}</td>
            <td className="px-4 py-3 text-sm text-amber-600">{row.pending}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      row.completion_percentage >= 80 ? 'bg-green-500' :
                      row.completion_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${row.completion_percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{row.completion_percentage}%</span>
              </div>
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">
              {row.last_submission ? new Date(row.last_submission).toLocaleDateString() : 'N/A'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function GradeReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters] = useState({
    quarter: '',
    grade_level: '',
  });

  const generateReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      let res;
      switch (selectedReport.id) {
        case 'submission':
          res = await api.get('/grade-submissions/admin_monitoring/');
          setReportData(res.data.teacher_details || []);
          break;
        case 'missing':
          res = await api.get('/grades/summary/', { params: { quarter: filters.quarter || undefined } });
          setReportData(res.data.missing_grades || []);
          break;
        case 'completion':
          res = await api.get('/grade-submissions/admin_monitoring/');
          setReportData({
            total: res.data.total_teachers,
            submitted: res.data.submitted_teachers,
            pending: res.data.pending_teachers,
            overdue: res.data.overdue_teachers,
            percentage: res.data.completion_percentage,
            teacher_details: res.data.teacher_details || [],
          });
          break;
        case 'late':
          res = await api.get('/grade-submissions/', { params: { status: 'overdue' } });
          setReportData(res.data || []);
          break;
        default:
          setReportData(null);
      }
    } catch {
      toast.error('Failed to generate report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, filters]);

  useEffect(() => {
    if (selectedReport) generateReport();
  }, [selectedReport, generateReport]);

  const handleExport = (format) => {
    if (!reportData) return;

    if (format === 'csv') {
      let csv = '';
      if (Array.isArray(reportData)) {
        if (reportData.length > 0) {
          const headers = Object.keys(reportData[0]);
          csv = headers.join(',') + '\n';
          csv += reportData.map(row => headers.map(h => `"${row[h] || ''}"`).join(',')).join('\n');
        }
      } else {
        csv = 'Metric,Value\n';
        Object.entries(reportData).forEach(([k, v]) => {
          csv += `"${k}","${v}"\n`;
        });
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport.id}_report.csv`;
      link.click();
      link.remove();
      toast.success('CSV exported');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grade Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and export grade management reports</p>
      </div>

      {!selectedReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => setSelectedReport(report)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => { setSelectedReport(null); setReportData(null); }}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
            <h2 className="text-lg font-semibold text-gray-900">{selectedReport.label}</h2>
            {reportData && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  Export CSV
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardBody>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded" />)}
                </div>
              ) : !reportData ? (
                <EmptyState title="No Data" description="No data available for this report." />
              ) : selectedReport.id === 'completion' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-3xl font-bold text-gray-900">{reportData.total}</p>
                      <p className="text-sm text-gray-500">Total Teachers</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{reportData.submitted}</p>
                      <p className="text-sm text-gray-500">Submitted</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <p className="text-3xl font-bold text-amber-600">{reportData.pending}</p>
                      <p className="text-sm text-gray-500">Pending</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-3xl font-bold text-purple-600">{reportData.percentage}%</p>
                      <p className="text-sm text-gray-500">Completion</p>
                    </div>
                  </div>
                  {reportData.teacher_details?.length > 0 && (
                    <SubmissionReportTable data={reportData.teacher_details} />
                  )}
                </div>
              ) : Array.isArray(reportData) ? (
                <SubmissionReportTable data={reportData} />
              ) : (
                <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
