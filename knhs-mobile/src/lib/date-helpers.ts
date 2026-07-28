export function getCurrentAcademicYear(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 6 ? year : year - 1;
}

export function getAcademicYearRange(academicYear: number): string {
  return `${academicYear}-${academicYear + 1}`;
}

export function getCurrentSemester(): number {
  const now = new Date();
  const month = now.getMonth();

  if (month >= 5 && month <= 9) return 1;
  if (month >= 10 && month <= 1) return 2;
  return 3;
}

export function getSemesterName(semester: number): string {
  const names: Record<number, string> = {
    1: '1st Semester',
    2: '2nd Semester',
    3: '3rd Semester',
  };
  return names[semester] || 'Unknown Semester';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function isDateInRange(dateString: string, startDate: string, endDate: string): boolean {
  const date = new Date(dateString);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return date >= start && date <= end;
}

export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateString: string): boolean {
  return getDaysUntil(dateString) < 0;
}

export function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}

export function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function getEndOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}