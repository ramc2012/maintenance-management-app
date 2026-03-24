import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const {
      instrumentTagId,
      sourceSystem,
      certificateNo,
      calibrationDate,
      resultStatus,
      performedBy,
      maxError,
      eventData // Full ISO 10012 payload
    } = req.body;

    logger.info('fms_sync_received', { instrumentTagId, certificateNo });

    // Validate if the instrument exists in MM
    const instrument = await prisma.instrumentMaster.findUnique({
      where: { tagId: instrumentTagId }
    });

    if (!instrument) {
      logger.warn('fms_sync_unknown_instrument', { instrumentTagId });
      return res.status(404).json({ message: 'Instrument tag not found in Maintenance Management' });
    }

    // Wrap the entire sync in a transaction to ensure database consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Replicate the ISO 10012 Event
      const calibrationEvent = await tx.calibrationEvent.upsert({
        where: { certificateNo },
        update: {
          calibrationDate: new Date(calibrationDate),
          overallResultAsLeft: resultStatus,
          maxErrorLeftPct: maxError,
          performedBy,
          // Extract specific fields if needed
        },
        create: {
          certificateNo,
          instrumentTagId,
          standardUsedId: eventData.standardUsedId || 'UNKNOWN-STD', // Should map to a valid standard
          calibrationDate: new Date(calibrationDate),
          nextDueDate: new Date(new Date(calibrationDate).setFullYear(new Date(calibrationDate).getFullYear() + 1)),
          overallResultAsFound: eventData.overallResultAsFound || resultStatus,
          overallResultAsLeft: resultStatus,
          performedBy,
          ambientTemp: eventData.ambientTemp,
          humidity: eventData.humidity,
          atmosphericPressure: eventData.atmosphericPressure,
          maxErrorFoundPct: eventData.maxErrorFoundPct,
          maxErrorLeftPct: maxError,
          remarks: `Synced from FMS Track App: ${eventData.remarks || ''}`
        }
      });

      // 2. Replicate the Points (if provided)
      if (eventData.points && Array.isArray(eventData.points) && eventData.points.length > 0) {
        // Clear existing to avoid duplicates on upsert anomalies
        await tx.calibrationPoint.deleteMany({
          where: { eventId: calibrationEvent.id }
        });

        await tx.calibrationPoint.createMany({
          data: eventData.points.map((p: any) => ({
            eventId: calibrationEvent.id,
            sequence: p.sequence,
            stepPercent: p.stepPercent,
            direction: p.direction,
            inputApplied: p.inputApplied,
            inputUnit: p.inputUnit,
            expectedReading: p.expectedReading,
            expectedUnit: p.expectedUnit,
            asFoundReading: p.asFoundReading,
            asFoundError: p.asFoundError,
            asFoundResult: p.asFoundResult,
            asLeftReading: p.asLeftReading,
            asLeftError: p.asLeftError,
            asLeftResult: p.asLeftResult
          }))
        });
      }

      // 3. Create the Unified History View Record
      const unifiedHistory = await tx.unifiedCalibrationHistory.create({
        data: {
          instrumentTagId,
          calDate: new Date(calibrationDate),
          resultStatus: resultStatus,
          sourceSystem: sourceSystem || 'AUTOMATED', // Hybrid routing identifier
          internalEventId: calibrationEvent.id, // Linking back to the cert
          performedBy,
          maxError
        }
      });

      return { calibrationEvent, unifiedHistory };
    });

    logger.info('fms_sync_completed', { certificateNo });
    return res.status(201).json(result);

  } catch (error) {
    logger.error('fms_sync_failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return res.status(500).json({ message: 'Internal sync error' });
  }
});

export default router;
