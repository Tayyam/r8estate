import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PORT, APP_URL } from './env.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import claimsRoutes from './routes/claims.js';

const app = express();
app.use(
  cors({
    origin: [APP_URL, /^http:\/\/localhost:\d+$/],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/claims', claimsRoutes);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT} (APP_URL=${APP_URL})`);
});
