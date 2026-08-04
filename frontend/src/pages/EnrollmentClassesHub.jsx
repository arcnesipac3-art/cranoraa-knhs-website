import PortalHubShell from '../components/PortalHubShell';
import StudentEnrollment from './StudentEnrollment';
import EnrollmentManagement from './EnrollmentManagement';
import ClassManagement from './ClassManagement';

const tabs = [
  { id: 'student-enrollment', label: 'Student Enrollment', component: StudentEnrollment, roles: ['admin', 'staff'] },
  { id: 'applications', label: 'Applications', component: EnrollmentManagement, roles: ['admin', 'staff'] },
  { id: 'classrooms', label: 'Class Management', component: ClassManagement, roles: ['admin', 'staff'] },
];

const EnrollmentClassesHub = () => (
  <PortalHubShell
    title="Enrollment & Classes"
    description="Handles application review, roster placement, and classroom setup from a single admissions workspace."
    tabs={tabs}
    showHeader={false}
  />
);

export default EnrollmentClassesHub;
