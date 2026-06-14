import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All farm routes require authentication
router.use(authenticate);

// POST /api/v1/farms
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, latitude, longitude, altitudeMeters,
      cropType, soilType, areaHectares,
      irrigationEfficiency, solarPanelCapacityW,
      pumpPowerW, tiltDegrees, azimuthDegrees,
      performanceRatio, iotDeviceId,
    } = req.body;

    if (!name || latitude == null || longitude == null || altitudeMeters == null ||
        !cropType || !soilType || areaHectares == null ||
        irrigationEfficiency == null || solarPanelCapacityW == null || pumpPowerW == null) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const farm = await prisma.farm.create({
      data: {
        userId: req.userId!,
        name,
        latitude,
        longitude,
        altitudeMeters,
        cropType,
        soilType,
        areaHectares,
        irrigationEfficiency,
        solarPanelCapacityW,
        pumpPowerW,
        tiltDegrees: tiltDegrees ?? null,
        azimuthDegrees: azimuthDegrees ?? null,
        performanceRatio: performanceRatio ?? null,
        iotDeviceId: iotDeviceId ?? null,
      },
    });

    res.status(201).json(farm);
  } catch (error) {
    console.error('Create farm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/farms
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const farms = await prisma.farm.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(farms);
  } catch (error) {
    console.error('List farms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/farms/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const farm = await prisma.farm.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!farm) {
      res.status(404).json({ error: 'Farm not found' });
      return;
    }
    res.json(farm);
  } catch (error) {
    console.error('Get farm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/farms/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const farm = await prisma.farm.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!farm) {
      res.status(404).json({ error: 'Farm not found' });
      return;
    }

    const allowedFields = [
      'name', 'cropType', 'soilType', 'areaHectares',
      'irrigationEfficiency', 'solarPanelCapacityW', 'pumpPowerW', 'altitudeMeters',
    ];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    }

    const updated = await prisma.farm.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update farm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/farms/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const farm = await prisma.farm.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!farm) {
      res.status(404).json({ error: 'Farm not found' });
      return;
    }

    await prisma.farm.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete farm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
