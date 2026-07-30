import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useSystemSettings } from '../hooks/useSystemSettings';

const FORM_CARDS = [
  {
    id: 'sf1',
    title: 'SF1 - School Register',
    description: 'Class register with enrolled students, LRN, demographics, and enrollment status.',
    icon: '📋',
    color: 'violet',
    path: '/school-forms/sf1',
    roles: ['admin', 'staff'],
    features: ['Excel Export', 'Print', 'PDF Export'],
  },
  {
    id: 'sf2',
    title: 'SF2 - Daily Attendance Report',
    description: 'Attendance sheets with daily, monthly, and quarterly summaries.',
    icon: '📊',
    color: 'blue',
    path: '/school-forms/sf2',
    roles: ['admin', 'staff'],
    features: ['PDF Export', 'Excel Export', 'Print'],
  },
  {
    id: 'sf5',
    title: 'SF5 - Promotion and Learning Progress',
    description: 'Promotion status with general averages and class summary statistics.',
    icon: '📈',
    color: 'emerald',
    path: '/school-forms/sf5',
    roles: ['admin', 'staff'],
    features: ['PDF Export', 'Excel Export', 'Print'],
  },
  {
    id: 'sf9',
    title: 'SF9 - Learner Progress Report Card',
    description: 'Official report cards with quarter grades, core values, and attendance summary.',
    icon: '🎓',
    color: 'gold',
    path: '/school-forms/sf9',
    roles: ['admin', 'staff', 'student', 'parent'],
    features: ['PDF Export', 'Print'],
  },
  {
    id: 'sf10',
    title: 'SF10 - Permanent Academic Record',
    description: 'Complete academic history with enrollment, grades, and promotion records.',
    icon: '📁',
    color: 'rose',
    path: '/school-forms/sf10',
    roles: ['admin', 'staff'],
    features: ['PDF Export', 'Excel Export', 'Print'],
  },
];

export default function SchoolFormsDashboard() {
  const navigate = useNavigate();
  const { activeYear } = useAcademicYear();
  const { settings } = useSystemSettings();
  const [loading, setLoading] = useState(false);

  const handleGenerate = (formId) => {
    navigate(`/school-forms/${formId}`);
  };

  const filteredCards = FORM_CARDS.filter(card =>
    card.roles.includes(localStorage.getItem('userRole') || 'student')
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">School Forms</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate DepEd school forms from existing records
          {activeYear && <span className="ml-2">• Academic Year: {activeYear.name}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map(card => (
          <Card key={card.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <h3 className="font-bold text-slate-900">{card.title}</h3>
                  <Badge color={card.color}>{card.features[0]}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-600">{card.description}</p>
            </CardBody>
            <CardFooter>
              <div className="flex flex-wrap gap-1.5">
                {card.features.map(feature => (
                  <Badge key={feature} color="slate" size="sm">{feature}</Badge>
                ))}
              </div>
              <Button
                onClick={() => handleGenerate(card.id)}
                className="ml-auto"
                size="sm"
              >
                Open Form
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}