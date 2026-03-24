import { Router } from 'express';
import {
  getInstruments,
  createInstrument,
  updateInstrument
} from '../controllers/equipment.controller';

const router = Router();

// GET all instruments
router.get('/', getInstruments);

// POST create new instrument  
router.post('/', createInstrument);

// PUT update instrument by tagId
router.put('/:tagId', updateInstrument);

// DELETE instrument (optional - not all systems need this)
router.delete('/:tagId', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.instrumentMaster.delete({ where: { tagId: req.params.tagId } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete instrument' });
  }
});

export default router;
