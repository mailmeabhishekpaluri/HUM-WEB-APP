import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import authRoutes from './routes/auth';
import cciRoutes from './routes/cci';
import dashboardRoutes from './routes/dashboard';
import childrenRoutes from './routes/children';
import volunteerRoutes from './routes/volunteers';
import opportunityRoutes from './routes/opportunities';
import notificationRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import reportRoutes from './routes/reports';
import auditRoutes from './routes/audit';
import seriesRoutes from './routes/series';
import teamRoutes from './routes/teams';
import healthRoutes from './routes/health';
import classRoutes from './routes/classes';
import programRoutes from './routes/programs';
import libraryRoutes from './routes/library';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/ccis', cciRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/programs', programRoutes);

app.get('/api/healthz', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use(errorHandler);
