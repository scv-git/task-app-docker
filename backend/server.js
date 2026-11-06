const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3001);
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (_error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

app.get('/tasks', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, title, completed, created_at FROM tasks ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar las tareas' });
  }
});

app.post('/tasks', async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    return res.status(400).json({ error: 'El titulo es obligatorio' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, completed, created_at',
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (_error) {
    res.status(500).json({ error: 'No se pudo crear la tarea' });
  }
});

app.put('/tasks/:id', async (req, res) => {
  const completed = Boolean(req.body.completed);
  try {
    const result = await pool.query(
      'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at',
      [completed, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(result.rows[0]);
  } catch (_error) {
    res.status(500).json({ error: 'No se pudo actualizar la tarea' });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.status(204).end();
  } catch (_error) {
    res.status(500).json({ error: 'No se pudo eliminar la tarea' });
  }
});

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  app.listen(port, () => console.log(`Backend de tareas en puerto ${port}`));
}

start().catch((error) => {
  console.error('No se pudo iniciar el backend:', error.message);
  process.exit(1);
});
