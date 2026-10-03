const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues[0]?.message || 'Validation error';
    return res.status(400).json({ message });
  }
  req.body = result.data;
  next();
};

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

const loginSchema = z.object({
  identifier: z.string().min(3, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

const registerSchoolSchema = z.object({
  school: z.object({
    name: z.string().min(2, 'School name is required'),
    shortName: z.string().optional(),
    motto: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid school email').optional().or(z.literal('')),
    gesRegNumber: z.string().optional(),
  }),
  owner: z.object({
    name: z.string().min(2, 'Your name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(9, 'Phone number is required').optional(),
    password: passwordSchema,
  }),
  academicYear: z
    .object({
      name: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

const schoolUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  shortName: z.string().optional(),
  motto: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gesRegNumber: z.string().optional(),
  logoUrl: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

const academicYearSchema = z.object({
  name: z.string().min(4, 'Name is required, e.g. 2025/2026'),
  startDate: z.string(),
  endDate: z.string(),
});

const termSchema = z.object({
  name: z.enum(['TERM_1', 'TERM_2', 'TERM_3']),
  startDate: z.string(),
  endDate: z.string(),
  vacationDate: z.string().optional(),
  nextTermBegins: z.string().optional(),
});

const levelSchema = z.object({
  name: z.string().min(1, 'Level name is required'),
  code: z.string().optional(),
  stage: z.enum(['KG', 'PRIMARY', 'JHS']),
  order: z.number().int(),
});

const schoolClassSchema = z.object({
  levelId: z.number().int(),
  name: z.string().min(1, 'Class name is required'),
  capacity: z.number().int().optional(),
  classTeacherId: z.number().int().optional().nullable(),
});

const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required'),
  code: z.string().optional(),
  isCore: z.boolean().optional(),
});

const classSubjectBulkSchema = z.object({
  classId: z.number().int(),
  subjects: z.array(
    z.object({
      subjectId: z.number().int(),
      teacherId: z.number().int().optional().nullable(),
    })
  ),
});

const assessmentTypeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  shortCode: z.string().optional(),
  weight: z.number().min(0).max(100),
  order: z.number().int().optional(),
});

const gradingScaleSchema = z.object({
  levelId: z.number().int().nullable(),
  grades: z.array(
    z.object({
      grade: z.string().min(1),
      minScore: z.number().min(0).max(100),
      maxScore: z.number().min(0).max(100),
      descriptor: z.string().optional(),
      remark: z.string().optional(),
    })
  ),
});

const studentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  otherNames: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  healthNotes: z.string().optional(),
  photoUrl: z.string().optional(),
  classId: z.number().int(),
  guardians: z
    .array(
      z.object({
        name: z.string().min(2, 'Guardian name is required'),
        relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
        phone: z.string().min(9, 'Guardian phone is required'),
        whatsapp: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        occupation: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .min(1, 'At least one guardian is required'),
});

const studentUpdateSchema = studentSchema.partial().extend({
  status: z.enum(['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN']).optional(),
  currentClassId: z.number().int().optional().nullable(),
});

const guardianSchema = z.object({
  name: z.string().min(2, 'Guardian name is required'),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']).optional(),
  phone: z.string().min(9, 'Guardian phone is required'),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  occupation: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const attendanceMarkSchema = z.object({
  classId: z.number().int(),
  date: z.string(),
  records: z
    .array(
      z.object({
        studentId: z.number().int(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
        reason: z.string().optional(),
      })
    )
    .min(1, 'Attendance records are required'),
});

const scoreEntrySchema = z.object({
  classId: z.number().int(),
  subjectId: z.number().int(),
  termId: z.number().int(),
  entries: z
    .array(
      z.object({
        studentId: z.number().int(),
        assessmentTypeId: z.number().int(),
        rawScore: z.number().min(0).max(100).nullable(),
      })
    )
    .min(1, 'Score entries are required'),
});

const publishReportsSchema = z.object({
  classId: z.number().int(),
  termId: z.number().int(),
});

const remarksSchema = z.object({
  teacherRemark: z.string().optional().nullable(),
  headRemark: z.string().optional().nullable(),
  conduct: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  talent: z.string().optional().nullable(),
  promoted: z.boolean().optional().nullable(),
  promotedTo: z.string().optional().nullable(),
});

const feeStructureSchema = z.object({
  termId: z.number().int(),
  classId: z.number().int(),
  name: z.string().min(2).default('Term fees'),
  items: z
    .array(
      z.object({
        name: z.string().min(2, 'Fee item name is required'),
        amount: z.number().min(0),
      })
    )
    .min(1, 'At least one fee item is required'),
});

const generateInvoicesSchema = z.object({
  structureId: z.number().int(),
});

const paymentSchema = z.object({
  invoiceId: z.number().int(),
  amount: z.number().positive('Amount must be greater than zero'),
  method: z.enum(['CASH', 'MOMO', 'BANK', 'CHEQUE', 'OTHER']).optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

const discountSchema = z.object({
  discountAmount: z.number().min(0),
});

const announcementSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  body: z.string().min(2, 'Message is required'),
  audience: z.enum(['ALL', 'STAFF', 'CLASS']).optional(),
  classId: z.number().int().optional(),
  isPinned: z.boolean().optional(),
  sendSms: z.boolean().optional(),
});

const ROLE_ENUM = ['OWNER', 'HEADTEACHER', 'DEPUTY_HEAD', 'ACADEMIC_COORDINATOR', 'TEACHER', 'ACCOUNTANT', 'SECRETARY', 'SUPPORT_STAFF'];

const staffCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  role: z.enum(ROLE_ENUM),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(9).optional(),
  password: passwordSchema,
  staffNo: z.string().optional(),
  position: z.string().optional(),
});

const staffUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLE_ENUM).optional(),
  isActive: z.boolean().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
});

const rolePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

const promoteSchema = z.object({
  classId: z.number().int(),
  toClassId: z.number().int().optional(),
  overrides: z
    .array(
      z.object({
        studentId: z.number().int(),
        action: z.enum(['PROMOTE', 'REPEAT', 'GRADUATE']),
        toClassId: z.number().int().optional(),
      })
    )
    .optional(),
});

const platformSchoolSchema = z.object({
  name: z.string().min(2, 'School name is required'),
  city: z.string().optional(),
  phone: z.string().optional(),
  plan: z.enum(['FREE', 'STANDARD', 'PREMIUM']).optional(),
  owner: z.object({
    name: z.string().min(2, 'Owner name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: passwordSchema,
  }),
});

const platformStatusSchema = z.object({
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED']).optional(),
  plan: z.enum(['FREE', 'STANDARD', 'PREMIUM']).optional(),
});

module.exports = {
  validate,
  loginSchema,
  changePasswordSchema,
  registerSchoolSchema,
  schoolUpdateSchema,
  academicYearSchema,
  termSchema,
  levelSchema,
  schoolClassSchema,
  subjectSchema,
  classSubjectBulkSchema,
  assessmentTypeSchema,
  gradingScaleSchema,
  studentSchema,
  studentUpdateSchema,
  guardianSchema,
  attendanceMarkSchema,
  scoreEntrySchema,
  publishReportsSchema,
  remarksSchema,
  feeStructureSchema,
  generateInvoicesSchema,
  paymentSchema,
  discountSchema,
  announcementSchema,
  staffCreateSchema,
  staffUpdateSchema,
  rolePermissionsSchema,
  promoteSchema,
  platformSchoolSchema,
  platformStatusSchema,
};
