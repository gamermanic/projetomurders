import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// --------- MEMBERS ---------

app.get('/api/members', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });

    const result = await query(
      'select id, clan, nick, level, power, classe, data from members where clan = $1 order by nick asc',
      [clan]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao listar membros' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const { clan, nick, level, power, classe, data } = req.body;
    if (![1, 2].includes(Number(clan))) return res.status(400).json({ error: 'clan inválido' });
    if (!nick) return res.status(400).json({ error: 'nick obrigatório' });

    const result = await query(
      `insert into members (clan, nick, level, power, classe, data)
       values ($1, $2, $3, $4, $5, $6)
       returning id, clan, nick, level, power, classe, data`,
      [clan, nick, level || null, power || null, classe || null, data || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao criar membro' });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nick, level, power, classe, data } = req.body;
    if (!id) return res.status(400).json({ error: 'id inválido' });

    const result = await query(
      `update members
         set nick = $1,
             level = $2,
             power = $3,
             classe = $4,
             data = $5
       where id = $6
       returning id, clan, nick, level, power, classe, data`,
      [nick, level || null, power || null, classe || null, data || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'membro não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao atualizar membro' });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });

    await query('delete from members where id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao excluir membro' });
  }
});

app.delete('/api/members', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });
    await query('delete from members where clan = $1', [clan]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao apagar membros do clã' });
  }
});

// --------- EVENTS ---------

app.get('/api/events', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });
    const result = await query(
      'select id, clan, data, evento, nick, status, justificativa from events where clan = $1 order by data asc',
      [clan]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao listar eventos' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { clan, data, evento, nick, status, justificativa } = req.body;
    if (![1, 2].includes(Number(clan))) return res.status(400).json({ error: 'clan inválido' });
    if (!data || !evento || !nick || !status) return res.status(400).json({ error: 'campos obrigatórios faltando' });

    const result = await query(
      `insert into events (clan, data, evento, nick, status, justificativa)
       values ($1, $2, $3, $4, $5, $6)
       returning id, clan, data, evento, nick, status, justificativa`,
      [clan, data, evento, nick, status, justificativa || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao criar evento' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data, evento, nick, status, justificativa } = req.body;
    const result = await query(
      `update events
         set data = $1,
             evento = $2,
             nick = $3,
             status = $4,
             justificativa = $5
       where id = $6
       returning id, clan, data, evento, nick, status, justificativa`,
      [data, evento, nick, status, justificativa || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'evento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao atualizar evento' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query('delete from events where id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao excluir evento' });
  }
});

app.delete('/api/events', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });
    await query('delete from events where clan = $1', [clan]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao apagar eventos do clã' });
  }
});

// --------- DELIVERIES ---------

app.get('/api/deliveries', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });
    const result = await query(
      'select id, clan, data, nick, classe, descricao from deliveries where clan = $1 order by data asc',
      [clan]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao listar entregas' });
  }
});

app.post('/api/deliveries', async (req, res) => {
  try {
    const { clan, data, nick, classe, descricao } = req.body;
    if (![1, 2].includes(Number(clan))) return res.status(400).json({ error: 'clan inválido' });
    if (!data || !nick || !classe || !descricao) return res.status(400).json({ error: 'campos obrigatórios faltando' });

    const result = await query(
      `insert into deliveries (clan, data, nick, classe, descricao)
       values ($1, $2, $3, $4, $5)
       returning id, clan, data, nick, classe, descricao`,
      [clan, data, nick, classe, descricao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao criar entrega' });
  }
});

app.put('/api/deliveries/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { data, nick, classe, descricao } = req.body;
    const result = await query(
      `update deliveries
         set data = $1,
             nick = $2,
             classe = $3,
             descricao = $4
       where id = $5
       returning id, clan, data, nick, classe, descricao`,
      [data, nick, classe, descricao, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'entrega não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao atualizar entrega' });
  }
});

app.delete('/api/deliveries/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query('delete from deliveries where id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao excluir entrega' });
  }
});

app.delete('/api/deliveries', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });
    await query('delete from deliveries where clan = $1', [clan]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao apagar entregas do clã' });
  }
});

// --------- REPO_ITEMS ---------

app.get('/api/repo', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });

    const result = await query(
      'select id, clan, item, tipo, boss, qtd from repo_items where clan = $1 order by item asc',
      [clan]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao listar repositório' });
  }
});

app.post('/api/repo', async (req, res) => {
  try {
    const { clan, item, tipo, boss, qtd } = req.body;
    if (![1, 2].includes(Number(clan))) return res.status(400).json({ error: 'clan inválido' });
    if (!item) return res.status(400).json({ error: 'item obrigatório' });

    const result = await query(
      `insert into repo_items (clan, item, tipo, boss, qtd)
       values ($1, $2, $3, $4, $5)
       returning id, clan, item, tipo, boss, qtd`,
      [clan, item, tipo || null, boss || null, qtd || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao criar item' });
  }
});

app.put('/api/repo/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { item, tipo, boss, qtd } = req.body;
    const result = await query(
      `update repo_items
         set item = $1,
             tipo = $2,
             boss = $3,
             qtd = $4
       where id = $5
       returning id, clan, item, tipo, boss, qtd`,
      [item, tipo || null, boss || null, qtd || 0, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'item não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao atualizar item' });
  }
});

app.delete('/api/repo/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query('delete from repo_items where id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao excluir item' });
  }
});

app.delete('/api/repo', async (req, res) => {
  try {
    const clan = Number(req.query.clan);
    if (![1, 2].includes(clan)) return res.status(400).json({ error: 'clan inválido' });
    await query('delete from repo_items where clan = $1', [clan]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao apagar repositório do clã' });
  }
});

// --------- START ---------

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API rodando na porta ${port}`);
});
