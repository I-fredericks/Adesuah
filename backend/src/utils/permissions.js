// Adesuah RBAC: granular permission catalog and the default matrix per role.
// Schools may customise the matrix at runtime (RolePermission table); when a
// school has no rows for a role these defaults apply.

const CATALOG = [
  { key: 'students.view', group: 'Students', label: 'View students (own assignments)' },
  { key: 'students.view_all', group: 'Students', label: 'View all students in the school' },
  { key: 'students.create', group: 'Students', label: 'Enroll / admit students' },
  { key: 'students.edit', group: 'Students', label: 'Edit student records & guardians' },
  { key: 'students.status', group: 'Students', label: 'Change student status (graduate, withdraw)' },
  { key: 'students.promote', group: 'Students', label: 'Run end-of-year promotion' },
  { key: 'students.transfer', group: 'Students', label: 'Transfer students between classes' },
  { key: 'attendance.view', group: 'Attendance', label: 'View attendance (own assignments)' },
  { key: 'attendance.view_all', group: 'Attendance', label: 'View attendance school-wide' },
  { key: 'attendance.enter', group: 'Attendance', label: 'Mark daily attendance' },
  { key: 'grades.view', group: 'Grades', label: 'View scores & results (own assignments)' },
  { key: 'grades.view_all', group: 'Grades', label: 'View all scores & results' },
  { key: 'grades.enter', group: 'Grades', label: 'Enter and edit scores' },
  { key: 'grades.edit_any', group: 'Grades', label: 'Edit other teachers’ scores' },
  { key: 'grades.approve', group: 'Grades', label: 'Review / approve submitted results' },
  { key: 'reports.view', group: 'Report cards', label: 'View report cards (own assignments)' },
  { key: 'reports.view_all', group: 'Report cards', label: 'View all report cards' },
  { key: 'reports.publish', group: 'Report cards', label: 'Publish / freeze report cards' },
  { key: 'reports.remarks', group: 'Report cards', label: 'Edit remarks on report cards' },
  { key: 'fees.view', group: 'Fees', label: 'View fees & invoices' },
  { key: 'fees.structure_manage', group: 'Fees', label: 'Create & edit fee structures' },
  { key: 'fees.invoice_generate', group: 'Fees', label: 'Generate term invoices' },
  { key: 'fees.payment_record', group: 'Fees', label: 'Record payments & print receipts' },
  { key: 'fees.discount', group: 'Fees', label: 'Apply discounts & waivers' },
  { key: 'fees.remind', group: 'Fees', label: 'Send fee reminders' },
  { key: 'fees.reports', group: 'Fees', label: 'Debtors & collection reports' },
  { key: 'payroll.view_all', group: 'Payroll', label: 'See all staff salary payments' },
  { key: 'payroll.record', group: 'Payroll', label: 'Record staff salary payments' },
  { key: 'academics.view', group: 'Academics', label: 'View classes, subjects, terms & grading' },
  { key: 'academics.manage', group: 'Academics', label: 'Modify academic structure & settings' },
  { key: 'staff.view', group: 'Staff', label: 'View staff list' },
  { key: 'staff.manage', group: 'Staff', label: 'Add, edit & deactivate staff' },
  { key: 'staff.reset_password', group: 'Staff', label: 'Reset staff passwords' },
  { key: 'announcements.view', group: 'Communication', label: 'View announcements' },
  { key: 'announcements.send', group: 'Communication', label: 'Publish announcements & SMS' },
  { key: 'school.view', group: 'School', label: 'View school profile' },
  { key: 'school.settings', group: 'School', label: 'Edit school profile & settings' },
  { key: 'roles.manage', group: 'School', label: 'Customise role permissions' },
];

const CATALOG_KEYS = CATALOG.map((c) => c.key);

const ALL = [...CATALOG_KEYS];

const DEFAULT_ROLE_PERMISSIONS = {
  OWNER: ALL,
  HEADTEACHER: [
    'students.view', 'students.view_all', 'students.create', 'students.edit',
    'students.status', 'students.promote', 'students.transfer',
    'attendance.view', 'attendance.view_all', 'attendance.enter',
    'grades.view', 'grades.view_all', 'grades.enter', 'grades.approve',
    'reports.view', 'reports.view_all', 'reports.publish', 'reports.remarks',
    'fees.view', 'fees.reports',
    'payroll.view_all',
    'academics.view', 'academics.manage',
    'staff.view', 'staff.manage', 'staff.reset_password',
    'announcements.view', 'announcements.send',
    'school.view',
  ],
  DEPUTY_HEAD: [
    'students.view', 'students.view_all', 'students.edit',
    'students.promote', 'students.transfer',
    'attendance.view', 'attendance.view_all', 'attendance.enter',
    'grades.view', 'grades.view_all', 'grades.approve',
    'reports.view', 'reports.view_all', 'reports.remarks',
    'academics.view',
    'staff.view',
    'announcements.view', 'announcements.send',
    'school.view',
  ],
  ACADEMIC_COORDINATOR: [
    'students.view', 'students.view_all',
    'attendance.view',
    'grades.view', 'grades.view_all', 'grades.enter', 'grades.approve',
    'reports.view', 'reports.view_all',
    'academics.view', 'academics.manage',
    'staff.view',
    'announcements.view',
    'school.view',
  ],
  TEACHER: [
    'students.view',
    'attendance.view', 'attendance.enter',
    'grades.view', 'grades.enter',
    'reports.view',
    'academics.view',
    'announcements.view',
    'school.view',
  ],
  ACCOUNTANT: [
    'students.view', 'students.view_all',
    'fees.view', 'fees.structure_manage', 'fees.invoice_generate',
    'fees.payment_record', 'fees.discount', 'fees.remind', 'fees.reports',
    'payroll.view_all', 'payroll.record',
    'announcements.view',
    'school.view',
  ],
  SECRETARY: [
    'students.view', 'students.view_all', 'students.create', 'students.edit',
    'attendance.view', 'attendance.view_all',
    'grades.view',
    'fees.view', 'fees.payment_record',
    'staff.view',
    'announcements.view', 'announcements.send',
    'school.view',
  ],
  SUPPORT_STAFF: [
    'students.view',
    'announcements.view',
    'school.view',
  ],
  PARENT: [],
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'Platform Admin',
  OWNER: 'Proprietor / Owner',
  ADMIN: 'Administrator (legacy)',
  HEADTEACHER: 'Headteacher',
  DEPUTY_HEAD: 'Deputy Head',
  ACADEMIC_COORDINATOR: 'Academic Coordinator',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant / Bursar',
  SECRETARY: 'Secretary / Administrator',
  SUPPORT_STAFF: 'Support Staff',
  PARENT: 'Parent / Guardian',
};

const STAFF_ROLES = [
  'OWNER',
  'HEADTEACHER',
  'DEPUTY_HEAD',
  'ACADEMIC_COORDINATOR',
  'TEACHER',
  'ACCOUNTANT',
  'SECRETARY',
  'SUPPORT_STAFF',
];

const LEGACY_ROLE_MAP = { ADMIN: 'HEADTEACHER' };

const normalizeRole = (role) => LEGACY_ROLE_MAP[role] || role;

const hasPermission = (granted, needed) => {
  if (!granted || granted.length === 0) return false;
  const set = new Set(granted);
  return set.has(needed);
};

module.exports = {
  CATALOG,
  CATALOG_KEYS,
  ALL,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_LABELS,
  STAFF_ROLES,
  LEGACY_ROLE_MAP,
  normalizeRole,
  hasPermission,
};
