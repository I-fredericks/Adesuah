const {
  CATALOG_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_ROLES,
  ROLE_LABELS,
  normalizeRole,
  hasPermission,
} = require('../src/utils/permissions');

describe('RBAC defaults matrix', () => {
  test('every role in the matrix is a staff role with labels', () => {
    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
      expect(ROLE_LABELS[role]).toBeDefined();
    }
    for (const role of STAFF_ROLES) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  test('every permission in every role exists in the catalog', () => {
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const p of perms) {
        expect(CATALOG_KEYS).toContain(p);
      }
    }
  });

  test('catalog keys are unique', () => {
    expect(new Set(CATALOG_KEYS).size).toBe(CATALOG_KEYS.length);
  });

  test('owner can do everything', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.OWNER.sort()).toEqual([...CATALOG_KEYS].sort());
  });

  test('finance roles have no academic entry and teachers no fees', () => {
    const accountant = DEFAULT_ROLE_PERMISSIONS.ACCOUNTANT;
    expect(accountant).toContain('fees.payment_record');
    expect(accountant).not.toContain('grades.enter');

    const teacher = DEFAULT_ROLE_PERMISSIONS.TEACHER;
    expect(teacher).toContain('grades.enter');
    expect(teacher.some((p) => p.startsWith('fees.'))).toBe(false);
    expect(teacher).not.toContain('students.view_all');
  });

  test('headteacher is school-wide but proprietor-only items excluded', () => {
    const head = DEFAULT_ROLE_PERMISSIONS.HEADTEACHER;
    expect(head).toContain('students.view_all');
    expect(head).toContain('reports.publish');
    expect(head).not.toContain('fees.payment_record');
    expect(head).not.toContain('roles.manage');
  });
});

describe('permission resolution helpers', () => {
  test('legacy ADMIN normalizes to HEADTEACHER', () => {
    expect(normalizeRole('ADMIN')).toBe('HEADTEACHER');
    expect(normalizeRole('TEACHER')).toBe('TEACHER');
  });

  test('hasPermission', () => {
    expect(hasPermission(['grades.enter'], 'grades.enter')).toBe(true);
    expect(hasPermission(['grades.enter'], 'fees.view')).toBe(false);
    expect(hasPermission([], 'grades.enter')).toBe(false);
    expect(hasPermission(null, 'grades.enter')).toBe(false);
  });
});
