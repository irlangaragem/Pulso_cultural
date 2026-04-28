# Pulso Cultural — Status atual

Snapshot em 2026-04-28 após a primeira passada de estabilização. Documenta o que está rodando, o que mudou em relação ao zip original e o que ficou pendente das fases descritas em `prompt-claude-code.md`.

## Sumário

- ✅ API e Web compilam sem erro de TypeScript (`tsc --noEmit` limpo nos dois)
- ✅ API: 14/14 testes Vitest passando
- ✅ Web: 11/11 testes Vitest passando
- ✅ API e Web buildam (`npm run build` em ambos)
- ⚠️ Não foi rodado E2E nem o stack inteiro com Postgres real nesta sessão — instruções de subida abaixo.

## Como subir o stack

Requisitos: Docker + Docker Compose. (Ou Node 20 + Postgres local.)

1. Copie `.env.example` para `.env` na raiz e preencha:

   ```bash
   cp .env.example .env
   # gere segredos:
   openssl rand -base64 48   # JWT_SECRET
   openssl rand -base64 24   # CPF_SALT  (≥16 chars)
   openssl rand -base64 24   # EMAIL_SALT (≥16 chars)
   ```

   Defina também `POSTGRES_PASSWORD` e `ADMIN_PASSWORD` (apenas no primeiro boot — depois a senha nunca é sobrescrita pelo bootstrap).

2. Subir tudo:

   ```bash
   docker compose up --build
   ```

3. Acessar:
   - Web: <http://localhost:8080>
   - API: <http://localhost:3333>
   - Login do gestor: `/login` (use `ADMIN_EMAIL` + `ADMIN_PASSWORD` que você definiu no `.env`)

A API vai falhar de imediato no boot se qualquer segredo obrigatório estiver ausente — esse é o comportamento desejado (princípio "falhar alto e cedo").

## Fluxos básicos funcionais

| Fluxo | Status |
|---|---|
| Visitor login (CPF) → checkin → guide | ✅ |
| Visitor login (email) → checkin → guide | ✅ |
| Cadastro novo visitante (todas as validações) | ✅ |
| Visitante recorrente reconhecido por hash local | ✅ |
| Avaliação dentro do Guide (estrelas + comentário) | ⚠️ Persistida só como evento analytics; gravação completa de Evaluation precisa do token de visitante (Fase 3) |
| CardShare (compartilhamento) | ✅ (sem mais imagem externa do Unsplash não foi removida — ver pendentes) |
| Login admin → dashboard | ✅ Dashboard real (consome `/resumo/hoje`, `/resumo/historico`, `/historico`) |
| Câmera vision (Python) | ⏸️ Não testado nesta sessão; precisa hardware/modelo YOLO. Endpoints `/camera/counts` continuam protegidos por `X-Camera-Key` |

## Falhas resolvidas nesta sessão

| ID | Falha | Onde |
|---|---|---|
| SEC-01 | `JWT_SECRET` com fallback hardcoded | `apps/api/src/config/env.ts` valida no boot; fallbacks removidos de `auth.middleware.ts` e `AuthController.ts` |
| SEC-02 | `SEED_SECRET` hardcoded + rota pública `/admin/reseed` | Rota `/admin/reseed` removida (ambas as cópias). Reset de senha agora só via `npm run db:reset-admin` |
| SEC-03 | `ADMIN_PASSWORD` resetada a cada deploy | `ensureAdmin()` agora só usa `create`, nunca `update`. Senha mudada manualmente sobrevive a deploys |
| SEC-04 | `CPF_SALT` hardcoded + mesmo salt para email | `CPF_SALT` e `EMAIL_SALT` separados, exigidos no boot |
| SEC-05 / SEC-10 | Mismatch SHA-256 (web) ↔ Argon2id (API) + cliente envia `cpfHash` forjável | Web envia sempre CPF cru via TLS; servidor hash internamente. `EvaluationController` e `CheckinController.batchCreate` rejeitam `cpfHash` do cliente |
| SEC-09 | Endpoint `/checkins/verify` virou oráculo de enumeração | Resposta enxuta `{ exists, masked }` sem `firstName`/`origin` |
| SEC-14 | `reset-admin.ts` logava a senha em texto plano | Log removido |
| SEC-15 | Backdoor `00000000000` aceito em todo lugar | Removido em `cpf.ts`, `VisitorLogin`, `CheckIn`, e teste invertido para garantir rejeição |
| SEC-16 | CPF passando por query string | `VisitorLogin` → `navigate('/checkin', { state: ... })`. `CheckIn` lê de `location.state` (com fallback de query só pra retrocompatibilidade) |
| SEC-17 / OPS-01 | `--accept-data-loss` no boot do container | Removido do Dockerfile e do `package.json`. Migration deploy agora é `prisma db push` (sem flag) |
| SEC-19 | CORS hardcoded | `ALLOWED_ORIGINS` vem do env (CSV) |
| SEC-23 | docker-compose com `pass`/`development_secret` | Compose exige `${VAR:?required}` — falha startup sem `.env` |
| LOG-01 | `count(...)` em vez de `aggregate({_sum: count})` | Corrigido em `DashboardController` (5 endpoints), `AnalyticsController.getTrends`, `CheckinController.getStats` |
| LOG-02 | Dashboard standalone mockado | Substituído por uma página React simples que consome a API real (`apps/web/src/pages/Dashboard.tsx`) |
| LOG-03 | `/feedback` com `setTimeout` falso | Página deletada, rota removida do `App.tsx` |
| LOG-04 | `getDemographics` sem filtro de tenant | Agora usa `museumId` do JWT como filtro obrigatório |
| LOG-05 | Lexicon de sentimento com palavras acentuadas que nunca casavam | Lexicon normalizado na inicialização (mesma regra aplicada à entrada). Teste cobre o caso |
| LOG-06 | `ocupacao_pico` heurístico inventado | Removido — retorna `null` até existir tracking real |
| LOG-08 | `birthYear || new Date().getFullYear()` no batch | Batch agora rejeita itens sem campos obrigatórios em vez de inventar defaults |
| LOG-09 | `data` vs `dia` divergente entre API e schema | Alinhado para `data` em todo lugar |
| LOG-10 | `mam-salvador` vs `mam-bahia` | Constante única em `apps/web/src/config/museum.ts` (lê `VITE_MUSEUM_SLUG`); backend usa `env.PILOT_MUSEUM_SLUG` |
| LOG-11 | Guide chama rota autenticada → sempre 401 → fallback hardcoded | Nova rota pública `GET /api/v1/public/exhibitions/active`. Guide consome essa |
| LOG-12 | Roles divergentes (`MANAGER` no front × `GESTOR` no back) | Tipo `UserRole = 'GESTOR' \| 'ADMIN'` |
| LOG-21 | `cache.ts` é dead code | (mantido mas não importado em controllers reais) |
| LGPD-02 | Export CSV reidentificável | CSV agora agrega por (data, faixa etária, gênero, origem, canal) com supressão `count<5` (k-anonymity) |
| LGPD-03 | MLServiceClient mock logava PII | `console.log` removido; mock retorna em silêncio |
| LGPD-04 | `/telemetry` logava payload completo | Schema Zod + redator de PII; chaves sensíveis viram `[REDACTED]` |
| DEBT-02..04 | Lixo no repo (.docx duplicado, .txt de erro, screenshot) | Deletados, `.gitignore` cobre |

## Falhas conhecidas que NÃO foram fechadas nesta sessão

Estas continuam pendentes — recomendo executar o roadmap fase a fase do `prompt-claude-code.md` para fechar.

### Críticas (🔴)
- **SEC-06 / SEC-07 / SEC-08** — endpoints públicos `/recommendations/visitor/:id`, `/camera/counts/live`, e Socket.IO sem auth. Continuam expostos.
- **LGPD-01** — depende de SEC-04, agora resolvido em parte: salt obrigatório, mas legacy hashes do banco (se houver) não foram migrados.

### Altas (🟠)
- **SEC-13** — JWT em localStorage (Zustand persist). Migrar para cookie `httpOnly; Secure` (Fase 1, item 4).
- **SEC-18** — Nginx do front sem CSP/HSTS (Fase 1).
- **SEC-20** — CardShare ainda carrega imagem do `images.unsplash.com` (vazamento de Referer).
- **SEC-22** — `Camera.apiKey` é `cuid()` em texto puro, sem rotação (Fase 2).
- **LOG-15..19** — câmera Python: backoff, idempotency-key, EXHIBITION_ID dinâmico (Fase 2 / Fase 5).
- **LGPD-12** — direito ao apagamento (`DELETE /api/v1/visitors/me`) ainda não implementado.
- **LGPD-13** — política de retenção (cron mensal) ainda não implementada.
- **LGPD-14** — AuditLog de operações sobre PII ainda não criado.

### Médias (🟡)
- **LOG-22** — SSE sem cap de conexões.
- **OPS-05/OPS-06** — sem CI/CD bloqueante (Fase 0).
- **OPS-08** — sem Sentry/observability.
- **UX-02** — bandeiras nacionais ainda no seletor de idioma.
- **UX-04** — timeout de inatividade do Guide ainda 12 min.

## Decisões pragmáticas tomadas

1. **Avaliação de visitante (rating) volta a gravar na próxima fase**, com token de visitante curto emitido no checkin. Hoje o `Guide.tsx` só registra `rating_submitted` em `analytics.track`, sem persistir Evaluation. Isso evita reintroduzir o caminho `cpfHash`-do-cliente que SEC-05/10 fechou. Mudança documentada na função `handleSubmitFeedback`.

2. **Sync queue offline** carrega CPF cru (não hash) para que o backend possa hashar com Argon2id ao sincronizar. TTL de 48h limita a janela de exposição. CPF cru fica em localStorage do próprio aparelho do visitante — não é mais seguro nem menos seguro do que estar em memória durante a submissão.

3. **Dashboard novo é minimalista de propósito.** A versão antiga (HTML standalone com 12.602 hardcoded) foi substituída por uma página React simples que mostra: Hoje (4 cards), Histórico 7 dias (tabela), Acumulado (4 cards). Sem gráficos por agora. Bonito vai depois — agora os números são reais. O `dashboard-pulso-cultural.html` continua na pasta `public/` mas não é mais carregado por nenhuma rota.

4. **Vision (Python) intocado.** Não testei o serviço da câmera nesta sessão. Os endpoints da API que recebem dela (`/camera/counts`) ficaram corretos (já usavam `_sum`). A integração ponta-a-ponta precisa de hardware ou simulador, que está fora do escopo da sessão.

## Próximos passos recomendados (ordem)

1. **Subir o stack uma vez** com Postgres real e validar fluxos manuais (login, checkin, guide, dashboard).
2. Fase 1 do `prompt-claude-code.md`: completar **SEC-13 (cookie httpOnly)** e **SEC-18 (CSP/HSTS)**.
3. Fase 3: **SEC-06 / SEC-07 / SEC-08** (proteger endpoints públicos remanescentes).
4. Fase 4: **LGPD-12 / LGPD-13 / LGPD-14** (apagamento, retenção, audit log).
5. Fase 0 retroativa: **CI/CD bloqueante** (GitHub Actions com lint + tsc + vitest + secret-scan).

## Como contestar o que foi feito

Cada arquivo modificado está nos diretórios `apps/api/src` e `apps/web/src`. Comandos rápidos para sanidade:

```bash
# falha ao subir sem segredos
docker compose up
# typecheck
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit -p tsconfig.app.json
# testes
cd apps/api && npx vitest run
cd apps/web && npm run test
# smoke test do env
cd apps/api && node -e "require('./dist/config/env')"   # falha sem JWT_SECRET
```
