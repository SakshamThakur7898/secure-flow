// src/routes/testRoutes.js
import { sendJson } from '../utils/http.js';
import { requireRole } from './adminRoutes.js';
import { runOneTest, TEST_ORDER } from '../testRunner.js';
import { insertTestHistory, listTestHistory, clearTestHistory } from '../db.js';

export function registerTestRoutes(router) {
  // ---- POST /api/tests/run/:key  (single requirement) -------------------
  router.post('/api/tests/run/:key', requireRole('Admin'), async (req, res) => {
    const { key } = req.params;
    if (!TEST_ORDER.includes(key)) return sendJson(res, 400, { error: 'Unknown test.' });
    const result = await runOneTest(key);
    insertTestHistory(result);
    return sendJson(res, 200, result);
  });

  // ---- POST /api/tests/run-all  (all 5, sequentially, server-side) -----
  router.post('/api/tests/run-all', requireRole('Admin'), async (req, res) => {
    const results = [];
    for (const key of TEST_ORDER) {
      const result = await runOneTest(key);
      insertTestHistory(result);
      results.push(result);
    }
    const passed = results.filter((r) => r.status === 'PASSED').length;
    return sendJson(res, 200, {
      results,
      summary: { passed, failed: results.length - passed, total: results.length },
    });
  });

  // ---- GET /api/tests/history --------------------------------------------
  router.get('/api/tests/history', requireRole('Admin'), async (req, res) => {
    return sendJson(res, 200, { history: listTestHistory(200) });
  });

  // ---- DELETE /api/tests/history  (clear) --------------------------------
  router.delete('/api/tests/history', requireRole('Admin'), async (req, res) => {
    clearTestHistory();
    return sendJson(res, 200, { message: 'Test history cleared.' });
  });
}
