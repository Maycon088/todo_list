const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'items.json');
const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

async function readItems() {
  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(contents);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveItems(items) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryFile, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryFile, DATA_FILE);
  } catch (error) {
    await fs.rm(temporaryFile, { force: true }).catch(() => {});
    throw error;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw Object.assign(new Error('Corpo da requisição muito grande.'), { status: 413 });
  }
  try { return JSON.parse(body || '{}'); }
  catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}

async function handleApi(request, response, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[2];
  try {
    const items = await readItems();
    if (request.method === 'GET' && parts.length === 2) return sendJson(response, 200, items);

    if (request.method === 'POST' && parts.length === 2) {
      const body = await readBody(request);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const quantity = Number(body.quantity);
      if (!name || name.length > 120) return sendJson(response, 400, { error: 'Informe um item com até 120 caracteres.' });
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return sendJson(response, 400, { error: 'A quantidade deve ser um número entre 1 e 999.' });
      const item = { id: randomUUID(), name, quantity, completed: false, createdAt: new Date().toISOString() };
      items.push(item);
      await saveItems(items);
      return sendJson(response, 201, item);
    }

    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return sendJson(response, 404, { error: 'Item não encontrado.' });
    if (request.method === 'PUT' && parts.length === 3) {
      const body = await readBody(request);
      const current = items[index];
      const name = body.name === undefined ? current.name : (typeof body.name === 'string' ? body.name.trim() : '');
      const quantity = body.quantity === undefined ? current.quantity : Number(body.quantity);
      if (!name || name.length > 120) return sendJson(response, 400, { error: 'Informe um item com até 120 caracteres.' });
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return sendJson(response, 400, { error: 'A quantidade deve ser um número entre 1 e 999.' });
      items[index] = { ...current, name, quantity, completed: body.completed === undefined ? current.completed : Boolean(body.completed) };
      await saveItems(items);
      return sendJson(response, 200, items[index]);
    }
    if (request.method === 'DELETE' && parts.length === 3) {
      items.splice(index, 1);
      await saveItems(items);
      response.writeHead(204);
      return response.end();
    }
    return sendJson(response, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error(`[API ${request.method} ${url.pathname}]`, error);
    return sendJson(response, error.status || 500, { error: error.status ? error.message : 'Não foi possível acessar os dados.', detail: error.status ? undefined : error.message });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/items' || url.pathname.startsWith('/api/items/')) return handleApi(request, response, url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Método não permitido.' });

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403); return response.end('Acesso negado.');
  }
  try {
    const contents = await fs.readFile(filePath);
    response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    return request.method === 'HEAD' ? response.end() : response.end(contents);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end(error.code === 'ENOENT' ? 'Página não encontrada.' : 'Erro interno do servidor.');
  }
});

server.listen(PORT, () => console.log(`Lista de Compras disponível em http://localhost:${PORT}`));
