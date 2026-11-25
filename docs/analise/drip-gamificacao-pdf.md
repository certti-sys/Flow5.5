# Drip content, gamificação e leitor de PDF — Getfy × Flow

Levantamento de 2026-11-25. Referência: `Getfy/` (Laravel + Vue).
Flow: código atual deste repositório + produção (`pbrdmjcpipuatbnkvekz`).

Resumo: **gamificação o Flow já é melhor que o Getfy**. Drip content e leitor de
PDF não existem no Flow.

---

## 1. Drip content

### Como o Getfy faz

Colunas em `member_modules` e `member_lessons` (migration
`2026_03_15_000004_add_release_schedule_to_member_modules_and_lessons_tables.php`):

| tabela | coluna | tipo |
|---|---|---|
| `member_modules` | `release_after_days` | `unsignedInteger` NULL |
| `member_modules` | `release_at_date` | `date` NULL |
| `member_modules` | `release_progress_percent` | `unsignedTinyInteger` NULL |
| `member_modules` | `release_required_module_ids` | `json` NULL |
| `member_lessons` | `release_after_days` | `unsignedInteger` NULL |
| `member_lessons` | `release_at_date` | `date` NULL |

Cálculo (`MemberAreaAppController::scheduleMeta()`, :1795): data absoluta ganha
de relativo; relativo = `product_user.created_at` (data de compra do aluno) + N
dias. Aula travada = `max(liberação da aula, liberação do módulo)`.

Enforcement: sem middleware, sem RLS — tudo calculado on-request no controller e
injetado como `is_locked` / `lock_message` / `lock_reason` no payload Inertia.
Guarda dura em `assertLessonViewable()` (aborta 403 em complete/like/pdf/notes).

UI: card cinza com `Lock` + texto "Disponível em dd/mm/aaaa" ou "Disponível em N
dias". Sem countdown.

Lacunas do Getfy: nenhum e-mail/notificação na liberação, nenhum scheduler,
âncora nunca reinicia em recompra, `is_free` da aula ignorado no cálculo.

### O que o Flow tem

**Nada.** `lessons` só tem `is_public` (visível sem login). Não existe coluna de
agendamento em `lessons`, `modules` nem `courses`.

Acesso a curso: `user_course_access` com `granted_at` (default `now()`) —
é a âncora natural para o relativo, melhor que o pivô do Getfy porque é
explícita. Também há `user_course_categories` (acesso por categoria) e bypass de
admin em `check-course-access`.

### Lacuna

| # | Item | Ação |
|---|---|---|
| 1.1 | Colunas `release_after_days` / `release_at_date` em `modules` e `lessons` | migration |
| 1.2 | Cálculo + `is_locked` na listagem (`Course.tsx`, `LessonSidebar`) | na query, filtrando no cliente com `granted_at` já carregado |
| 1.3 | Guarda dura: bloquear `lesson-progress` e o player de aula travada | dentro da edge `check-course-access` (nova action) ou nova edge `lesson-access` |
| 1.4 | Campo no `LessonFormModal` e no editor de módulo | 3 modos: imediata / após X dias / na data |
| 1.5 | E-mail "conteúdo liberado" | depois, reaproveitando `email-queue` + cron |

Esforço: **1,5 dia**. Risco: médio — 1.3 é segurança; sem ele o bloqueio é só
visual (aluno abre `/aula/:id` direto e assiste).

---

## 2. Gamificação

### Como o Getfy faz

Não tem XP, não tem nível, não tem streak, não tem ranking. Só badge.

- Catálogo: JSON `products.member_area_config.gamification.achievements[]`,
  editável no Member Builder. Gatilhos fixos em código: `first_lesson`,
  `lessons_count`, `completion_percent`, `course_complete`, `first_comment`,
  `certificate_earned`. Recompensa = badge, nada mais.
- Tabela `member_achievement_unlocks` (unique `user_id, product_id, achievement_id`).
- Conquista de faturamento do produtor separada, thresholds em
  `config/conquistas.php` (R$ 10k → R$ 25M). Só badge + share.
- Conclusão de aula = 60% do vídeo assistido (não 100%).

### O que o Flow tem

Implementado e rodando em produção:

- `user_stats`: `total_xp`, `level` (`floor(xp/100)+1`), `current_streak`,
  `best_streak`, `lessons_today`, `last_activity_date`. 3 linhas em produção.
- 50 XP por aula concluída pela primeira vez (`lesson-progress`).
- 10 conquistas seedadas (5 aulas, 25 aulas, streak 3/7/30, 3 ou 5 aulas no dia…),
  `xp_reward` entre 20 e 400. 5 já desbloqueadas.
- `check-achievements` (edge) desbloqueia + manda e-mail/WhatsApp
  (`achievement_unlocked`, `level_up` — ambos existem em `message_templates`).
- `Leaderboard.tsx` + RPC `get_leaderboard_v2` com janela global/semanal/mensal,
  XP do período derivado das aulas concluídas no período.
- `retention-cron` manda `streak_at_risk` para quem vai perder ofensiva.
- Modais `AchievementUnlockedModal` / `LevelUpModal`, galeria em `Profile.tsx`,
  XP na sidebar.

### Lacuna (refinamento, não implementação)

| # | Item | Ação |
|---|---|---|
| 2.1 | `check-achievements` só conhece `lessons_completed`, `streak_days`, `daily_lessons` | adicionar `course_completed` e `comments_count` — exige join em `modules` |
| 2.2 | Zero UI de admin para conquistas | página `/admin/conquistas` (CRUD de `achievements`); hoje só via migration |
| 2.3 | Falta conquista de conclusão de curso | seed novo + critério 2.1 |
| 2.4 | `get_leaderboard_v2` sem opt-out | coluna `profiles.leaderboard_opt_out` — LGPD |

Esforço: **1 dia** (2.1+2.3+2.4). 2.2 é **0,5 dia** e é opcional.

Não implementar: conquistas por faturamento (decisão fechada do plano).

---

## 3. Leitor de PDF

### Como o Getfy faz

- `pdfjs-dist@4.10.38` com worker real (`pdf.worker.min.mjs?url`, bundle Vite).
  Render em `<canvas>` manual — sem text layer, sem seleção de texto, sem busca.
- 3 tipos de aula: `pdf` (material para baixar), `pdf_presentation` (slides) e
  `pdf_reader` (leitor completo).
- PDF passa por **proxy autenticado** (`GET /m/{slug}/aula/{lesson}/pdf/{index}`
  → controller lê bytes do storage/R2 e responde `inline`). Motivo: R2 sem CORS
  quebra o fetch do pdf.js.
- Leitor: miniaturas, zoom 0,5×–3×, tela cheia, teclado ←/→, paginação
  multi-arquivo, modo apresentação com lock de orientação.
- Anotações: `member_lesson_pdf_annotations` com `payload json` (array de
  highlights normalizados 0..1, cores yellow/green/pink, máx 500), 1 linha por
  (user, lesson, file_index), autosave com debounce 450 ms. Privadas do aluno.
- Progresso: só "chegou na última página" → `markComplete`. Sem progresso parcial,
  sem retomar última página, sem persistir zoom.

### O que o Flow tem

- `LessonMaterials` (`lesson_materials.type` ∈ `link|text|download|embed`), com
  CHECK constraint no banco. `download` é um `<a href download>` puro.
- Bucket `platform-assets` é **público** e aceita `application/pdf`, limite
  **10 MB**.
- `MaterialEditor` só aceita **URL digitada** — não existe upload de arquivo.
- Nenhuma dependência de PDF no `package.json` (só `jspdf`, gerador, usado para
  outra coisa).

### Lacuna

| # | Item | Ação |
|---|---|---|
| 3.1 | Bucket privado `lesson-files` + upload no `MaterialEditor` | migration + UI de upload, URL assinada na leitura |
| 3.2 | Novo tipo `pdf` em `lesson_materials` | alterar CHECK constraint + editor |
| 3.3 | Viewer `PdfViewer.tsx` com `pdfjs-dist` | canvas, prev/next, zoom, tela cheia |
| 3.4 | Progresso: emitir "lido" ao chegar na última página | reusa `markCompleted` de `useLessonProgress` |

Esforço: **2 dias** para o viewer básico (3.1 parcial + 3.2 + 3.3 + 3.4).
Anotações/highlights: **+2 dias**, e só valem a pena depois que o viewer existir.

Decisão pendente: **URL assinada vs. bucket público**. Hoje `platform-assets` é
público — PDF de curso pago ali fica baixável por qualquer um com o link. Se o
conteúdo for pago, bucket privado + `createSignedUrl` é obrigatório.

Não implementar agora: text layer/busca, outline, anotações, modo apresentação.

---

## Ordem sugerida

1. **PDF viewer** (2 d) — é o de maior valor percebido e não toca em segurança de acesso.
2. **Drip content** com a guarda dura (1,5 d) — a guarda é obrigatória junto; drip só visual não serve.
3. **Refinamento de conquistas** (1 d) — barato, o motor já existe.

Total ~4,5 dias. Cada item é independente.

---

## Pendências de decisão do usuário

- Drip: âncora relativa é `user_course_access.granted_at`? (é o que faz sentido)
- Drip: bloquear também por progresso (`%` do curso) e por módulo pré-requisito, como o Getfy? Ou só data/dias?
- PDF: bucket privado com URL assinada (recomendado) ou manter público e só limitar o tamanho?
- Anotações em PDF: entram no escopo ou ficam para depois?
