import 'dotenv/config';
import { app } from './app';
import { startComplianceJob } from './jobs/compliance.job';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`HUManity API running on http://localhost:${PORT}`);
  startComplianceJob();
  console.log('[Cron] Compliance job scheduled (daily 08:00)');
});
