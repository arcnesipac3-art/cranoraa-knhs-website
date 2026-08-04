import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAcademicYear } from '../context/AcademicYearContext';

const FORM_CARDS = [
  {
    id: 'sf1',
    title: 'SF1 - School Register',
    description: 'Class register with enrolled students, LRN, demographics, parent info, and enrollment status. Separates male and female students with totals.',
    icon: '📋',
    color: 'violet',
    path: '/school-forms/sf1',
    roles: ['admin', 'staff'],
    features: ['Excel Export', 'PDF Export', 'Print', 'Male/Female Split', 'Validation'],
    status: 'ready',
  },
  {
    id: 'sf2',
    title: 'SF2 - Daily Attendance Report',
    description: 'Attendance sheets with daily, monthly, and quarterly summaries for each section.',
    icon: '📊',
    color: 'blue',
    path: '/school-forms/sf2',
    roles: ['admin', 'staff'],
    features: ['PDF Export', 'Excel Export', 'Print'],
    status: 'ready',
  },
  {
    id: 'sf9',
    title: 'SF9 - Learner Progress Report Card',
    description: 'Official report cards with quarter grades, core values, attendance summary, and remarks.',
    icon: '🎓',
    color: 'gold',
    path: '/school-forms/sf9',
    roles: ['admin', 'staff', 'student', 'parent'],
    features: ['PDF Export', 'Print'],
    status: 'ready',
  },
  {
    id: 'sf10',
    title: 'SF10 - Permanent Academic Record',
    description: 'Complete academic history with enrollment records, grades, and promotion status across years.',
    icon: '📁',
    color: 'rose',
    path: '/school-forms/sf10',
    roles: ['admin', 'staff'],
    features: ['PDF Export', 'Excel Export', 'Print'],
    status: 'ready',
  },
];

const STATUS_COLORS = {
  ready: 'emerald',
  draft: 'amber',
  unavailable: 'slate',
};

export default function SchoolFormsDashboard() {
  const navigate = useNavigate();
  const { activeYear } = useAcademicYear();
  const userRole = localStorage.getItem('userRole') || 'student';

  const filteredCards = FORM_CARDS.filter(card => card.roles.includes(userRole));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">School Forms</h1>
            <p className="text-sm text-slate-500">
              Generate official DepEd school forms from existing records
              {activeYear && <span className="ml-2">• SY {activeYear.name}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardBody className="text-center py-3">
            <p className="text-2xl font-extrabold text-violet-600">{filteredCards.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Available Forms</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-3">
            <p className="text-2xl font-extrabold text-emerald-600">{filteredCards.filter(c => c.status === 'ready').length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Ready to Generate</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-3">
            <p className="text-2xl font-extrabold text-blue-600">4</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Form Types</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-3">
            <p className="text-2xl font-extrabold text-amber-600">
              {activeYear?.name || 'N/A'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Active Year</p>
          </CardBody>
        </Card>
      </div>

      {/* Form Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map(card => (
          <Card key={card.id} className="hover:shadow-lg transition-shadow group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{card.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{card.title}</h3>
                    <Badge color={STATUS_COLORS[card.status]} size="sm">
                      {card.status === 'ready' ? 'Ready' : card.status === 'draft' ? 'Draft' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-600 mb-3">{card.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {card.features.map(feature => (
                  <Badge key={feature} color="slate" size="sm">{feature}</Badge>
                ))}
              </div>
            </CardBody>
            <CardFooter>
              <Button
                onClick={() => navigate(card.path)}
                className="w-full"
                size="sm"
              >
                Open {card.title.split(' - ')[0]}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">
          All forms are auto-generated from existing enrollment, student, and classroom data. No manual encoding required.
        </p>
      </div>
    </div>
  );
}
