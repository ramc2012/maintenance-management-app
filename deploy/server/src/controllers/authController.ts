import { Request, Response } from 'express';
import { PrismaClient, type Discipline, type DisciplineAccessLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ALL_DISCIPLINES, buildAuthUserPayload, inferDisciplineFromText } from '../services/disciplineAccess';

const prisma = new PrismaClient();

const USER_MANAGER_ROLES = new Set(['ADMIN', 'HOD', 'ENGINEER', 'SUPERVISOR', 'CONTRACTOR_COORDINATOR']);
const FULL_SCOPE_ROLES = new Set(['ADMIN', 'HOD', 'ENGINEER', 'PROCUREMENT_OFFICER', 'L1', 'L2', 'L3', 'L4']);
const SUPERVISION_ROLES = new Set(['SUPERVISOR', 'CONTRACTOR_COORDINATOR']);
const VIEW_ONLY_ROLES = new Set(['VIEWER']);
const PROCUREMENT_ROLE_REGEX = /(procurement|buyer|materials|hpo|cpd|^l[1-4]$)/i;

const authUserSelect = {
  id: true,
  username: true,
  role: true,
  phone: true,
  jobTitle: true,
  departmentId: true,
  canCreateWorkOrder: true,
  canCloseWorkOrder: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  managerId: true,
  manager: {
    select: {
      id: true,
      username: true,
      role: true,
      jobTitle: true,
    },
  },
  disciplineAccesses: {
    select: {
      discipline: true,
      accessLevel: true,
      isDefault: true,
      canViewProcurement: true,
      canUpdateProcurement: true,
      canRaiseRequirements: true,
    },
    orderBy: [
      { isDefault: 'desc' as const },
      { discipline: 'asc' as const },
    ],
  },
};

const serializeUser = (user: any) => ({
  ...buildAuthUserPayload(user),
  phone: user.phone ?? null,
  jobTitle: user.jobTitle ?? null,
  departmentId: user.departmentId ?? user.department?.id ?? null,
  department: user.department ?? null,
  managerId: user.managerId ?? user.manager?.id ?? null,
  manager: user.manager ?? null,
});

const deriveAccessLevel = (role: string, jobTitle?: string | null): DisciplineAccessLevel => {
  const normalizedRole = String(role || '').trim().toUpperCase();
  const roleText = `${normalizedRole} ${jobTitle || ''}`;

  if (VIEW_ONLY_ROLES.has(normalizedRole)) {
    return 'VIEW';
  }

  if (FULL_SCOPE_ROLES.has(normalizedRole) || SUPERVISION_ROLES.has(normalizedRole) || PROCUREMENT_ROLE_REGEX.test(roleText)) {
    return 'MANAGE';
  }

  return 'EXECUTE';
};

const deriveDisciplineAccessPayload = (params: {
  role: string;
  jobTitle?: string | null;
  departmentName?: string | null;
  managerAccesses?: Array<{
    discipline: Discipline;
    accessLevel: DisciplineAccessLevel;
    isDefault: boolean;
    canViewProcurement: boolean;
    canUpdateProcurement: boolean;
    canRaiseRequirements: boolean;
  }>;
}) => {
  const normalizedRole = String(params.role || '').trim().toUpperCase();
  const procurementCapable = PROCUREMENT_ROLE_REGEX.test(`${normalizedRole} ${params.jobTitle || ''}`);
  const baseAccessLevel = deriveAccessLevel(normalizedRole, params.jobTitle);
  const managerDefaultDiscipline =
    params.managerAccesses?.find((entry) => entry.isDefault)?.discipline ||
    params.managerAccesses?.[0]?.discipline ||
    null;
  const inferredDiscipline =
    inferDisciplineFromText(params.departmentName) ||
    managerDefaultDiscipline ||
    inferDisciplineFromText(params.jobTitle) ||
    inferDisciplineFromText(normalizedRole);

  if (FULL_SCOPE_ROLES.has(normalizedRole)) {
    const defaultDiscipline = inferredDiscipline || 'MECHANICAL';
    return ALL_DISCIPLINES.map((discipline) => ({
      discipline,
      accessLevel: 'MANAGE' as DisciplineAccessLevel,
      isDefault: discipline === defaultDiscipline,
      canViewProcurement: true,
      canUpdateProcurement: true,
      canRaiseRequirements: true,
    }));
  }

  if (!inferredDiscipline) {
    return [];
  }

  return [
    {
      discipline: inferredDiscipline,
      accessLevel: baseAccessLevel,
      isDefault: true,
      canViewProcurement: true,
      canUpdateProcurement: procurementCapable || baseAccessLevel === 'MANAGE',
      canRaiseRequirements: baseAccessLevel !== 'VIEW',
    },
  ];
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        ...authUserSelect,
        password: true,
      },
    });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    const authUser = serializeUser(user);

    res.json({
      token,
      user: authUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
};

export const register = async (req: Request, res: Response) => {
  const actorRole = String(req.user?.role || '').toUpperCase();
  const {
    username,
    password,
    role,
    departmentId,
    managerId,
    phone,
    jobTitle,
    canCreateWorkOrder,
    canCloseWorkOrder,
  } = req.body;

  try {
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required.' });
    }

    const normalizedRole = String(role).trim().toUpperCase();
    if (actorRole !== 'ADMIN' && ['ADMIN', 'HOD'].includes(normalizedRole)) {
      return res.status(403).json({ message: 'Only administrators can create admin or HOD accounts.' });
    }

    const existing = await prisma.user.findUnique({
      where: { username: String(username).trim() },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const department = departmentId
      ? await prisma.department.findUnique({
          where: { id: String(departmentId) },
          select: { id: true, name: true },
        })
      : null;

    if (departmentId && !department) {
      return res.status(400).json({ message: 'Selected department was not found.' });
    }

    const manager = managerId
      ? await prisma.user.findUnique({
          where: { id: String(managerId) },
          select: {
            id: true,
            username: true,
            role: true,
            departmentId: true,
            disciplineAccesses: {
              select: {
                discipline: true,
                accessLevel: true,
                isDefault: true,
                canViewProcurement: true,
                canUpdateProcurement: true,
                canRaiseRequirements: true,
              },
              orderBy: [{ isDefault: 'desc' }, { discipline: 'asc' }],
            },
          },
        })
      : null;

    if (managerId && !manager) {
      return res.status(400).json({ message: 'Selected manager was not found.' });
    }

    if (manager && !USER_MANAGER_ROLES.has(manager.role)) {
      return res.status(400).json({ message: 'Selected manager cannot own direct reports.' });
    }

    if (manager && department && manager.departmentId && manager.departmentId !== department.id) {
      return res.status(400).json({ message: 'Manager must belong to the selected department.' });
    }

    const disciplineAccesses = deriveDisciplineAccessPayload({
      role: normalizedRole,
      jobTitle,
      departmentName: department?.name,
      managerAccesses: manager?.disciplineAccesses,
    });

    if (!FULL_SCOPE_ROLES.has(normalizedRole) && disciplineAccesses.length === 0) {
      return res.status(400).json({
        message: 'Assign a department or manager that maps the user to Mechanical, Electrical, or Instrumentation.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        password: hashedPassword,
        role: normalizedRole,
        departmentId: department?.id ?? null,
        managerId: manager?.id ?? null,
        phone: phone ? String(phone).trim() : null,
        jobTitle: jobTitle ? String(jobTitle).trim() : null,
        canCreateWorkOrder: Boolean(canCreateWorkOrder),
        canCloseWorkOrder: Boolean(canCloseWorkOrder),
        disciplineAccesses: disciplineAccesses.length
          ? {
              create: disciplineAccesses,
            }
          : undefined,
      },
      select: {
        ...authUserSelect,
        createdAt: true,
        lastLogin: true,
      },
    });
    res.status(201).json({
      ...serializeUser(user),
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                ...authUserSelect,
                lastLogin: true,
                createdAt: true,
            },
        });
        res.json(users.map((user) => ({
            ...serializeUser(user),
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
        })));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const updateUserPermissions = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { canCreateWorkOrder, canCloseWorkOrder } = req.body;

    try {
        const target = await prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (req.user?.role !== 'ADMIN' && ['ADMIN', 'HOD'].includes(target.role)) {
            return res.status(403).json({ message: 'Only administrators can update admin or HOD permissions.' });
        }
        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(canCreateWorkOrder !== undefined ? { canCreateWorkOrder: Boolean(canCreateWorkOrder) } : {}),
                ...(canCloseWorkOrder !== undefined ? { canCloseWorkOrder: Boolean(canCloseWorkOrder) } : {}),
            },
            select: authUserSelect,
        });
        res.json(serializeUser(user));
    } catch (error) {
        res.status(500).json({ message: 'Error updating permissions' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        if (req.user?.id === id) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }
        const target = await prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (req.user?.role !== 'ADMIN' && ['ADMIN', 'HOD'].includes(target.role)) {
            return res.status(403).json({ message: 'Only administrators can delete admin or HOD accounts.' });
        }
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        const target = await prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (req.user?.role !== 'ADMIN' && ['ADMIN', 'HOD'].includes(target.role)) {
            return res.status(403).json({ message: 'Only administrators can reset admin or HOD passwords.' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password' });
    }
};
