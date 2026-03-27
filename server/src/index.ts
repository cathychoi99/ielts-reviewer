import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import settingsRouter from './routes/settings.js';
import materialsRouter from './routes/materials.js';
import extractionsRouter from './routes/extractions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Simple password auth middleware — read dynamically each time
app.use('/api', (req, res, next) => {
  const accessPassword = process.env.ACCESS_PASSWORD || '';
  
  // Health check is public
  if (req.path === '/health') return next();
  // Auth verify endpoint is public
  if (req.path === '/auth/verify') return next();

  if (!accessPassword) return next(); // No password set = no auth required

  const token = req.headers['x-access-token'] as string;
  if (token !== accessPassword) {
    return res.status(401).json({ error: '访问密码错误' });
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Verify password endpoint
app.post('/api/auth/verify', (req, res) => {
  const accessPassword = process.env.ACCESS_PASSWORD || '';
  if (!accessPassword) {
    return res.json({ valid: true });
  }
  const { password } = req.body;
  if (password === accessPassword) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false, error: '密码错误' });
});

app.use('/api/settings', settingsRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/extractions', extractionsRouter);

// Serve frontend static files in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  const hasPassword = !!process.env.ACCESS_PASSWORD;
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Auth: ${hasPassword ? 'password required' : 'no password (open access)'}`);
});

export default app;
