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

// New Modules: Contracts, Presentations, Maintenance Requests, Manuals
import contractRoutes from "./routes/contracts.routes";
import presentationRoutes from "./routes/presentations.routes";
import maintenanceRequestRoutes from "./routes/maintenanceRequest.routes";
import manualsRoutes from "./routes/manuals.routes";

// Logbook extended routes
import logbookExtRoutes from "./routes/logbookExt.routes";

// Audit, Notification, Auto-WO
import auditRoutes from "./routes/audit.routes";
import notificationRoutes from "./routes/notification.routes";
import autoWORoutes from "./routes/autoWO.routes";

import { authenticateToken } from './middleware/auth';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
app.use('/api/logbook', logbookExtRoutes);

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

// New Modules
app.use('/api/contracts', contractRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/maintenance-requests', maintenanceRequestRoutes);
app.use('/api/manuals', manualsRoutes);

// Audit, Notification & Auto-WO
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/auto-wo', autoWORoutes);

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
});

export default app;
