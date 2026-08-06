const DOC_FIELD_MAP = [
  { field: 'birth_certificate',         docType: 'birth_certificate',         type: 'PSA Birth Certificate' },
  { field: 'report_card',               docType: 'report_card',               type: 'Report Card' },
  { field: 'form_138',                  docType: 'form_138',                  type: 'Form 138 / Grade 6 Certificate' },
  { field: 'certificate_of_completion', docType: 'certificate_of_completion', type: 'Certificate of Completion' },
  { field: 'good_moral_certificate',    docType: 'good_moral',                type: 'Good Moral Certificate' },
  { field: 'id_picture',                docType: 'id_picture',                type: 'ID Picture' },
  { field: 'last_school_attended_cert', docType: 'last_school_attended',      type: 'Last School Attended Certificate' },
];

export function getRequiredDocTypes(enrollment) {
  if (!enrollment) return DOC_FIELD_MAP.map(d => d.docType);

  const gradeLevel = String(enrollment.grade_level || '');
  const enrollmentType = enrollment.enrollment_type || 'new';
  const isALS = enrollment.is_als;
  const isReturning = enrollmentType === 'returning';
  const isTransferee = enrollmentType === 'transferee';
  const isSHS = gradeLevel === '11' || gradeLevel === '12';

  const requiredDocTypes = new Set();

  if (isALS) {
    requiredDocTypes.add('birth_certificate');
    requiredDocTypes.add('last_school_attended');
  } else if (isSHS) {
    requiredDocTypes.add('birth_certificate');
    requiredDocTypes.add('report_card');
    requiredDocTypes.add('certificate_of_completion');
    if (!isReturning) requiredDocTypes.add('good_moral');
  } else if (gradeLevel === '7') {
    requiredDocTypes.add('form_138');
    requiredDocTypes.add('birth_certificate');
  } else if (gradeLevel === '11') {
    requiredDocTypes.add('birth_certificate');
    requiredDocTypes.add('report_card');
    requiredDocTypes.add('certificate_of_completion');
  } else {
    requiredDocTypes.add('birth_certificate');
    if (isTransferee || !isReturning) requiredDocTypes.add('report_card');
    if (isTransferee) requiredDocTypes.add('good_moral');
  }

  return requiredDocTypes;
}

export function getRelevantDocFields(enrollment) {
  const required = getRequiredDocTypes(enrollment);
  return DOC_FIELD_MAP.filter(d => required.has(d.docType));
}

export { DOC_FIELD_MAP };
