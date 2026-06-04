import 'dotenv/config';
import { app } from './app';
import { startComplianceJob } from './jobs/compliance.job';
import { startSchedulerJob } from './jobs/schedule.job';
import { startRemindersJob } from './jobs/reminders.job';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`HUManity API running on http://localhost:${PORT}`);
  startComplianceJob();
  startSchedulerJob();
  startRemindersJob();
  console.log('[Cron] Jobs scheduled: compliance (08:00), scheduler (06:00), reminders (hourly)');
});
