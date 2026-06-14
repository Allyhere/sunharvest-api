import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All alert routes require authentication
router.use(authenticate);

// GET /api/v1/farms/:farmId/alerts
router.get('/farms/:farmId/alerts', async (req: AuthRequest, res: Response) => {
  try {
    const { farmId } = req.params;

    // Verify the farm belongs to the user
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, userId: req.userId! },
    });
    if (!farm) {
      res.status(404).json({ error: 'Farm not found' });
      return;
    }

    const { severity, acknowledged, limit, offset } = req.query;

    const where: Record<string, unknown> = { farmId };
    if (severity) where.severity = severity as string;
    if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string, 10) : 50,
      skip: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json(alerts);
  } catch (error) {
    console.error('List alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/:id
router.get('/alerts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { farm: { select: { userId: true } } },
    });

    if (!alert || alert.farm.userId !== req.userId) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const { farm, ...alertData } = alert;
    res.json(alertData);
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/alerts/:id/acknowledge
router.patch('/alerts/:id/acknowledge', async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { farm: { select: { userId: true } } },
    });

    if (!alert || alert.farm.userId !== req.userId) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const { acknowledged } = req.body;
    if (acknowledged === undefined) {
      res.status(400).json({ error: 'acknowledged field is required' });
      return;
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.id },
      data: { acknowledged },
    });

    res.json(updated);
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/alerts/:id
router.delete('/alerts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.id },
      include: { farm: { select: { userId: true } } },
    });

    if (!alert || alert.farm.userId !== req.userId) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    await prisma.alert.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
