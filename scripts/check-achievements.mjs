// Contrato do motor de conquistas: todo critério oferecido no admin
// precisa ser tratado pelo switch de check-achievements, senão a conquista
// fica impossível de desbloquear (o banco aceita criteria_type livre).
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rule = (p) => fs.readFileSync(p, 'utf8');

const front = rule('src/pages/admin/Achievements.tsx');
const edge = rule('supabase/functions/check-achievements/index.ts');
const hook = rule('src/hooks/useGamification.ts');
const lesson = rule('src/pages/Lesson.tsx');

const offered = [...front.matchAll(/value:\s*"([a-z_]+)"/g)].map((m) => m[1]);
const handled = [...edge.matchAll(/case\s+'([a-z_]+)'/g)].map((m) => m[1]);

const esperados = [
  'lessons_completed', 'streak_days', 'daily_lessons',
  'course_completed', 'comments_count',
];

assert.deepEqual(offered, esperados, `Select do admin oferece: ${offered.join(', ')}`);
for (const c of esperados) {
  assert.ok(handled.includes(c), `check-achievements não trata "${c}" — conquista impossível`);
}
assert.ok(edge.includes('course_completion_percent'), 'course_completed sem RPC de progresso');
assert.ok(edge.includes("from('comments')"), 'comments_count sem contagem em comments');
assert.ok(hook.includes("functions.invoke('check-achievements')"), 'front parou de invocar check-achievements');
assert.ok(lesson.includes("lesson-progress"), 'conclusão de aula deve passar por lesson-progress');

console.log(`ok — ${offered.length} critérios offertados e tratados pelo motor`);
