import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import caseRoutes from './routes/caseRoutes';
import budgetRoutes from './routes/budgetRoutes';
import orgRoutes from './routes/orgRoutes';
import equipmentRoutes from "./routes/equipment.routes";
import maintenanceRoutes from "./routes/maintenance.routes";
import logbookRoutes from "./routes/logbook.routes";
import operationsRoutes from './routes/operations.routes';

// ISO 14224 Asset Hierarchy Routes
import flRoutes from "./routes/fl.routes";
import assetRoutes from "./routes/asset.routes";
import pmsStrategyRoutes from "./routes/pms.routes";
import workorderRoutes from "./routes/workorder.routes";

// ISO 10012 Calibration Routes
import calibrationRoutes from "./routes/calibration.routes";

// ISO 14224 Full Compliance Routes (Failure Codes, RCM, MTBF)
import iso14224Routes from "./routes/iso14224.routes";
import engineRoutes from "./routes/engine.routes";
import flAssetRoutes from "./routes/flAsset.routes";
import instrumentRoutes from "./routes/instruments.routes";
import trainingRoutes from "./routes/training.routes";
import energyRoutes from "./routes/energy.routes";
import workshopRoutes from "./routes/workshop.routes";
import mohRoutes from "./routes/moh.routes";
import collaborationRoutes from "./routes/collaboration.routes";
import staticEquipmentRoutes from "./routes/staticEquipment.routes";
import contractRoutes from './routes/contracts.routes';
import presentationRoutes from './routes/presentations.routes';
import maintenanceRequestRoutes from './routes/maintenanceRequest.routes';
import manualsRoutes from './routes/manuals.routes';

// New Gap-Closure Routes
import notificationRoutes from './routes/notification.routes';
import auditRoutes from './routes/audit.routes';
import kpiRoutes from './routes/kpi.routes';
import inspectionRoutes from './routes/inspection.routes';
import checklistRoutes from './routes/checklist.routes';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import { sweepNotifications, getNotificationSweepCron } from './services/notificationService';
import { runPMAutoScheduler } from './services/pmSchedulerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Existing routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/equipment-logs', logbookRoutes);
app.use('/api/logbook', logbookRoutes);
app.use('/api/operations', operationsRoutes);

// ISO 14224 Asset Hierarchy Routes
app.use('/api/fl', flRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/pms', pmsStrategyRoutes);
app.use('/api/workorders', workorderRoutes);

// ISO 10012 Calibration Routes
app.use('/api/calibration', calibrationRoutes);

// ISO 14224 Full Compliance Routes
app.use('/api/iso14224', iso14224Routes);
app.use('/api/engines', engineRoutes);
app.use('/api/fl-assets', flAssetRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/workshop', workshopRoutes);
app.use('/api/moh', mohRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/static-equipment', staticEquipmentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/maintenance-requests', maintenanceRequestRoutes);
app.use('/api/manuals', manualsRoutes);

// Gap-Closure Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/checklists', checklistRoutes);

// Static file serving for WO attachments
app.use('/storage/wo-attachments', express.static(
  process.env.WO_STORAGE_PATH || require('path').join(process.cwd(), 'storage', 'wo-attachments')
));

const seedAdmin = async () => {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        console.log("Seeding admin...");
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });
        console.log("Admin user created successfully!");
    }
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  seedAdmin();

  // Start notification sweep cron (default: every 30 minutes)
  const sweepCron = getNotificationSweepCron();
  cron.schedule(sweepCron, () => {
    sweepNotifications().catch(err => console.error('[Notification Sweep] Error:', err));
  });
  console.log(`[Cron] Notification sweep scheduled: ${sweepCron}`);

  // Start PM auto-scheduler (daily at 6:00 AM)
  cron.schedule('0 6 * * *', () => {
    runPMAutoScheduler().catch(err => console.error('[PM Scheduler] Error:', err));
  });
  console.log('[Cron] PM auto-scheduler scheduled: daily at 06:00');
});

export default app;
