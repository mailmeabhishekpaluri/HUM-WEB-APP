import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3).optional(),
  email: z.string().optional(),
  password: z.string().min(1),
}).refine(d => d.identifier || d.email, { message: 'identifier or email required' });

export const volunteerCreateSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(7),
  email: z.string().email().optional().or(z.literal('')),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF', 'VOLUNTEER']),
  mobile: z.string().optional(),
});

export const cciSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['CHILDRENS_HOME', 'OBSERVATION_HOME', 'SPECIAL_HOME', 'SHELTER_HOME']),
  registrationNumber: z.string().min(1),
  district: z.string(),
  state: z.string(),
  fullAddress: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sanctionedCapacityBoys: z.number().int().min(0),
  sanctionedCapacityGirls: z.number().int().min(0),
  currentOccupancy: z.number().int().min(0),
  superintendentName: z.string(),
  superintendentPhone: z.string(),
  superintendentEmail: z.string().email().optional(),
  managingSociety: z.string(),
  dateOfEstablishment: z.string().optional(),
  fundingType: z.enum(['GOVT_FUNDED', 'NGO_FUNDED']),
  notes: z.string().optional(),
  primaryManagerId: z.string().optional(),
});

export const childSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  dateOfBirth: z.string(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  cciId: z.string(),
  admissionDate: z.string(),
  admissionSource: z.enum(['POLICE', 'CWC', 'SELF', 'NGO_REFERRAL', 'OTHER']),
  category: z.enum(['ORPHAN', 'SEMI_ORPHAN', 'ABANDONED', 'RESCUED_TRAFFICKING', 'RESCUED_ABUSE', 'DESTITUTE', 'OTHER']),
  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  cwcCaseNumber: z.string().optional(),
  guardianName: z.string().optional(),
  guardianContact: z.string().optional(),
  emergencyContact: z.string().optional(),
  educationalLevel: z.string().optional(),
  schoolName: z.string().optional(),
  aadhaar: z.string().length(12).optional(),
});

export const volunteerRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  city: z.string(),
});
