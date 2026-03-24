import { z } from 'zod';

export const allowedEquipmentCategories = [
  'STATIC',
  'RUNNING',
  'ELECTRICAL',
  'MECHANICAL',
  'INSTRUMENT',
] as const;

export const allowedServiceLines = ['SURFACE', 'DRILLING', 'WORKOVER'] as const;

export const allowedOperationalStatuses = [
  'WORKING',
  'NOT_WORKING',
  'UNDER_MOH',
  'OVERHAULING',
  'UNKNOWN',
] as const;

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const optionalJsonValue = z.record(z.any()).optional();

export const installationSchema = z.object({
  installationId: z.string().trim().min(1, 'Installation ID is required'),
  location: z.string().trim().min(1, 'Location is required'),
  type: z.enum(['Surface', 'Drilling Rig', 'Workover Rig', 'Mobile Units']),
  isActive: z.boolean().optional(),
});

export const installationUpdateSchema = installationSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one installation field must be provided'
);

const baseEquipmentSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .refine(
      (value) => allowedEquipmentCategories.includes(value.toUpperCase() as (typeof allowedEquipmentCategories)[number]),
      'Category must be STATIC, RUNNING, ELECTRICAL, MECHANICAL, or INSTRUMENT'
    )
    .transform((value) => value.toUpperCase()),
  equipmentTypeName: optionalTrimmedString,
  serviceLine: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => !value || allowedServiceLines.includes(value as (typeof allowedServiceLines)[number]),
      'Service line must be SURFACE, DRILLING, or WORKOVER'
    )
    .optional(),
  make: optionalTrimmedString,
  model: optionalTrimmedString,
  serialNumber: optionalTrimmedString,
  assetCode: optionalTrimmedString,
  powerRating: optionalTrimmedString,
  pmFrequencyDays: z.number().int().positive().max(3650).optional(),
  installationId: z.string().trim().min(1, 'Installation is required'),
  equipmentTypeId: optionalTrimmedString,
  operationalStatus: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) =>
        allowedOperationalStatuses.includes(value as (typeof allowedOperationalStatuses)[number]),
      'Operational status must be WORKING, NOT_WORKING, UNDER_MOH, OVERHAULING, or UNKNOWN'
    )
    .optional(),
  statusReason: optionalTrimmedString,
  statusUpdatedAt: z.coerce.date().optional(),
  specifications: optionalJsonValue,
});

export const runningEquipmentSchema = baseEquipmentSchema.extend({
  equipmentTag: z.string().trim().min(1, 'Equipment tag is required'),
});

export const runningEquipmentUpdateSchema = baseEquipmentSchema
  .omit({ installationId: true, category: true })
  .extend({
    category: baseEquipmentSchema.shape.category.optional(),
    installationId: z.string().trim().min(1).optional(),
  })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one equipment field must be provided'
  );

export const categoryEquipmentSchema = z.object({
  tagId: z.string().trim().min(1, 'Tag ID is required'),
  description: z.string().trim().min(1, 'Description is required'),
  category: baseEquipmentSchema.shape.category,
  equipmentType: z.string().trim().min(1, 'Equipment type is required'),
  serviceLine: baseEquipmentSchema.shape.serviceLine,
  manufacturer: optionalTrimmedString,
  modelNo: optionalTrimmedString,
  serialNo: optionalTrimmedString,
  assetCode: optionalTrimmedString,
  installationId: z.string().trim().min(1, 'Installation is required'),
  operationalStatus: baseEquipmentSchema.shape.operationalStatus,
  statusReason: optionalTrimmedString,
  statusUpdatedAt: z.coerce.date().optional(),
  specifications: optionalJsonValue,
});

export const categoryEquipmentUpdateSchema = categoryEquipmentSchema
  .omit({ tagId: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one equipment field must be provided'
  );

const optionalQueryString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const optionalPositiveInteger = z.coerce.number().int().min(1).optional();

export const equipmentListQuerySchema = z.object({
  page: optionalPositiveInteger,
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: optionalQueryString,
  category: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => !value || allowedEquipmentCategories.includes(value as (typeof allowedEquipmentCategories)[number]),
      'Category must be STATIC, RUNNING, ELECTRICAL, MECHANICAL, or INSTRUMENT'
    )
    .optional(),
  serviceLine: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => !value || allowedServiceLines.includes(value as (typeof allowedServiceLines)[number]),
      'Service line must be SURFACE, DRILLING, or WORKOVER'
    )
    .optional(),
  installationId: optionalQueryString,
  equipmentType: optionalQueryString,
  status: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) =>
        !value || allowedOperationalStatuses.includes(value as (typeof allowedOperationalStatuses)[number]),
      'Operational status must be WORKING, NOT_WORKING, UNDER_MOH, OVERHAULING, or UNKNOWN'
    )
    .optional(),
});

export const instrumentListQuerySchema = z.object({
  page: optionalPositiveInteger,
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: optionalQueryString,
  serviceLine: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => !value || allowedServiceLines.includes(value as (typeof allowedServiceLines)[number]),
      'Service line must be SURFACE, DRILLING, or WORKOVER'
    )
    .optional(),
  installationId: optionalQueryString,
  equipmentType: optionalQueryString,
});
