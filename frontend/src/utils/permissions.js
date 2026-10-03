export const PERMISSION_LABELS = {
  'students.view': { group: 'Students', label: 'View students in your assigned classes' },
  'students.view_all': { group: 'Students', label: 'View every student in the school' },
  'students.create': { group: 'Students', label: 'Admit / enroll new students' },
  'students.edit': { group: 'Students', label: 'Edit student and guardian details' },
  'students.status': { group: 'Students', label: 'Graduate or withdraw students' },
  'students.promote': { group: 'Students', label: 'Run end-of-year promotion' },
  'students.transfer': { group: 'Students', label: 'Move students between classes' },
  'attendance.view': { group: 'Attendance', label: 'View attendance for your classes' },
  'attendance.view_all': { group: 'Attendance', label: 'View attendance for the whole school' },
  'attendance.enter': { group: 'Attendance', label: 'Mark the daily attendance register' },
  'grades.view': { group: 'Grades', label: 'View scores for your classes' },
  'grades.view_all': { group: 'Grades', label: 'View all scores and results' },
  'grades.enter': { group: 'Grades', label: 'Enter and edit exam/test scores' },
  'grades.edit_any': { group: 'Grades', label: 'Edit any teacher’s scores' },
  'grades.approve': { group: 'Grades', label: 'Approve score corrections' },
  'reports.view': { group: 'Report cards', label: 'View report cards' },
  'reports.view_all': { group: 'Report cards', label: 'View all report cards' },
  'reports.publish': { group: 'Report cards', label: 'Publish and lock report cards' },
  'reports.remarks': { group: 'Report cards', label: 'Write remarks on report cards' },
  'fees.view': { group: 'Fees', label: 'View fees and invoices' },
  'fees.structure_manage': { group: 'Fees', label: 'Set up term fees for classes' },
  'fees.invoice_generate': { group: 'Fees', label: 'Generate term invoices' },
  'fees.payment_record': { group: 'Fees', label: 'Record payments and print receipts' },
  'fees.discount': { group: 'Fees', label: 'Give discounts and waivers' },
  'fees.remind': { group: 'Fees', label: 'Send fee reminders to parents' },
  'fees.reports': { group: 'Fees', label: 'See debtors and collection reports' },
  'payroll.view_all': { group: 'Payroll', label: 'See all staff salaries' },
  'payroll.record': { group: 'Payroll', label: 'Record staff salary payments' },
  'academics.view': { group: 'Academics', label: 'View classes, subjects and terms' },
  'academics.manage': { group: 'Academics', label: 'Set up classes, subjects, terms, extra classes and grading' },
  'staff.view': { group: 'Staff', label: 'See the staff list' },
  'staff.manage': { group: 'Staff', label: 'Add or deactivate staff accounts' },
  'staff.reset_password': { group: 'Staff', label: 'Reset staff passwords' },
  'announcements.view': { group: 'Communication', label: 'Read announcements' },
  'announcements.send': { group: 'Communication', label: 'Post announcements and SMS to parents' },
  'school.view': { group: 'School', label: 'View school profile' },
  'school.settings': { group: 'School', label: 'Edit the school profile' },
  'roles.manage': { group: 'School', label: 'Change what each role is allowed to do' },
};

export const roleCan = (permissions) => {
  if (permissions === null) return null; // unrestricted
  return permissions;
};

export const resizeImage = (file, maxSize = 320) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
