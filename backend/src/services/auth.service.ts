import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function signAccessToken(userId: string, role: string, email: string) {
  return jwt.sign({ userId, role, email }, ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  } as jwt.SignOptions);
}

export async function login(identifier: string, password: string) {
  // Accept either email or phone number as the login identifier
  const id = identifier.trim();
  const isEmail = id.includes('@');
  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: id } })
    : await prisma.user.findUnique({ where: { mobile: id } });
  if (!user?.passwordHash) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Account deactivated');
  const accessToken = signAccessToken(user.id, user.role, user.email ?? "");
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus } };
}

export async function createUser(data: {
  email: string; password: string; name: string; role: Role; mobile?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('Email already registered');
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: data.email, name: data.name, role: data.role, mobile: data.mobile, passwordHash, accountStatus: 'PENDING' },
    select: { id: true, email: true, name: true, role: true },
  });
  // Volunteers need a profile so they can complete it on first login
  if (data.role === 'VOLUNTEER') {
    await prisma.volunteerProfile.create({ data: { userId: user.id } });
  }
  return user;
}

// Generate a readable temporary password e.g. "Hum-4827"
function generateTempPassword(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Hum-${n}`;
}

export async function createVolunteer(data: { name: string; mobile: string; email?: string }) {
  const mobile = data.mobile.trim();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ mobile }, ...(data.email ? [{ email: data.email.trim() }] : [])] },
  });
  if (existing) throw new Error('A user with this phone number or email already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      mobile,
      email: data.email?.trim() || null,
      role: Role.VOLUNTEER,
      passwordHash,
      accountStatus: 'PENDING',
    },
    select: { id: true, name: true, mobile: true, email: true, role: true },
  });
  await prisma.volunteerProfile.create({ data: { userId: user.id } });
  return { user, tempPassword };
}

export async function refreshAccessToken(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) throw new Error('Invalid refresh token');
  const payload = jwt.verify(token, REFRESH_SECRET) as { userId: string };
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error('User not found');
  const accessToken = signAccessToken(user.id, user.role, user.email ?? "");
  return { accessToken };
}

export async function generateOtp(userId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.create({
    data: {
      userId,
      code: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return code;
}

export async function verifyOtp(userId: string, code: string): Promise<boolean> {
  const otps = await prisma.otpCode.findMany({
    where: { userId, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (!otps.length) return false;
  const valid = await bcrypt.compare(code, otps[0].code);
  if (valid) await prisma.otpCode.update({ where: { id: otps[0].id }, data: { used: true } });
  return valid;
}
