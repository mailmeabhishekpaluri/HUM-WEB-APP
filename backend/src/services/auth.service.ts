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

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Account deactivated');
  const accessToken = signAccessToken(user.id, user.role, user.email);
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

export async function refreshAccessToken(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) throw new Error('Invalid refresh token');
  const payload = jwt.verify(token, REFRESH_SECRET) as { userId: string };
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new Error('User not found');
  const accessToken = signAccessToken(user.id, user.role, user.email);
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
