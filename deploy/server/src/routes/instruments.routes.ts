import { Router } from 'express';
import {
  getInstruments,
  createInstrument,
  updateInstrument
} from '../controllers/equipment.controller';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { resolveScopedDisciplines } from '../services/disciplineAccess';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET all instruments
router.get('/', getInstruments);

// POST create new instrument  
router.post('/', createInstrument);

// PUT update instrument by tagId
router.put('/:tagId', updateInstrument);

// DELETE instrument (optional - not all systems need this)
router.delete('/:tagId', async (req, res) => {
  try {
    const disciplines = resolveScopedDisciplines(req.user, req.query.discipline);
    const instrument = await prisma.instrumentMaster.findFirst({
      where: {
        tagId: req.params.tagId,
        ...(disciplines.length === 1
          ? { primaryDiscipline: disciplines[0] }
          : { primaryDiscipline: { in: disciplines } }),
      },
      select: { tagId: true },
    });

    if (!instrument) {
      return res.status(404).json({ error: 'Instrument not found' });
    }

    await prisma.instrumentMaster.delete({ where: { tagId: req.params.tagId } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete instrument' });
  }
});

export default router;
