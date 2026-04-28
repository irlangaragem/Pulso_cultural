# Aba Gestores

Gestão de usuários (equipe do museu) que têm acesso ao painel administrativo do Pulso Cultural.

---

## 1. O que é

Tela do dashboard que controla **quem do museu pode entrar no painel**: criar novos usuários, mudar função, redefinir senha, desativar.

Substitui o modelo anterior em que toda a equipe compartilhava um único login `admin@mam.ba.gov.br`.

**Localização:** sidebar do dashboard → ícone 👤 **Gestores**.

**Componente:** `apps/web/src/pages/dashboard/GestoresTab.tsx`.

---

## 2. Por que existe

| Problema sem a aba | Como a aba resolve |
|---|---|
| Senha compartilhada entre 5+ pessoas | Cada pessoa tem login próprio |
| Quando alguém sai, todo mundo precisa trocar a senha | Desativa só a conta da pessoa que saiu |
| Sem rastreabilidade de quem fez o quê (LGPD Art. 37) | Cada operação fica vinculada a um usuário |
| Não existe forma de dar acesso temporário (estagiário, consultor) | Cria conta, define senha, depois desativa |
| Não dá pra ter níveis diferentes de permissão | Função `ADMIN` vs `GESTOR` (base pra autorização granular futura) |

---

## 3. Quem pode usar

Atualmente: **qualquer usuário autenticado** do museu (todos os endpoints estão sob `authMiddleware`).

> ⚠️ **Limitação conhecida**: a distinção `ADMIN` × `GESTOR` ainda **não é forçada** em nenhuma rota. Hoje é cosmética — qualquer gestor logado pode criar, desativar, redefinir senha. Próxima iteração: adicionar checagem `req.user.role === 'ADMIN'` nas rotas de mutação.

---

## 4. Funcionalidades

### 4.1 Listar equipe
Tabela mostrando: nome, email, função (dropdown editável), status (ativo/inativo), botões de ação.

A linha do usuário autenticado tem a badge **VOCÊ** em vermelho. Ações destrutivas sobre si mesmo são bloqueadas (ver §6).

### 4.2 Adicionar gestor
Botão **+ Adicionar gestor** abre formulário com:
- Nome completo
- Email (será o login)
- Senha inicial (mínimo 8 caracteres — deve ser comunicada à pessoa)
- Função (Gestor ou Administrador)

Backend valida unicidade do email — devolve 409 se já existir.

### 4.3 Mudar função inline
Dropdown na coluna "Função" altera entre `GESTOR` e `ADMIN` em tempo real (PUT /users/:id).

### 4.4 Redefinir senha
Botão **Senha** abre modal pedindo nova senha (mínimo 8). Útil quando:
- Pessoa esqueceu a senha
- Suspeita de vazamento
- Onboarding (definir senha provisória)

### 4.5 Desativar / Reativar
Soft delete — não apaga o registro, só marca `active=false`. Pessoa não consegue mais logar.

Botão volta a ser **Reativar** quando inativa.

---

## 5. API

Todas as rotas estão sob `/users` e exigem JWT válido (`Authorization: Bearer <token>`). O middleware filtra por `museumId` extraído do JWT — o usuário só vê/edita pessoas do **próprio museu** (multi-tenant).

| Método | Caminho | Body | Resposta | Notas |
|---|---|---|---|---|
| GET | `/users` | — | `User[]` (sem `passwordHash`) | Lista usuários do museu |
| POST | `/users` | `{ email, name, password, role? }` | `User` (201) | Senha ≥ 8 chars; email único; role default `GESTOR` |
| PUT | `/users/:id` | `{ name?, role?, active? }` | `User` | Email não pode mudar; senha tem rota separada |
| POST | `/users/:id/reset-password` | `{ newPassword }` | `{ ok: true }` | Recusa se `id === me` (use `/auth/change-password`) |
| DELETE | `/users/:id` | — | `User` (active=false) | Soft delete; recusa se sobra <1 ativo no museu, ou se `id === me` |

### Exemplo: criar gestor
```bash
curl -X POST http://localhost:3399/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@mam.ba.gov.br",
    "name": "Ana Silva",
    "password": "SenhaInicial123",
    "role": "GESTOR"
  }'
```

### Exemplo: redefinir senha de outro
```bash
curl -X POST http://localhost:3399/users/$ID/reset-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "NovaSenha456"}'
```

---

## 6. Regras de segurança

### 6.1 Multi-tenant isolation
Todas as queries no `UserController` filtram por `museumId` derivado do JWT. Um gestor do museu A **nunca** vê ou edita gestores do museu B, mesmo conhecendo o `id`.

### 6.2 Não-trancamento (anti-lockout)
- **Você não pode desativar a si mesmo.** Frontend desabilita o botão e backend retorna 400.
- **Você não pode desativar o último gestor ativo.** Backend conta `active=true` excluindo o alvo; recusa se `< 1` sobra.

### 6.3 Senhas
- Hash com `bcrypt` (cost 12) — nunca volta no JSON em nenhuma rota.
- Mínimo 8 caracteres no create e no reset.
- Reset de senha **de outra pessoa** é separado de mudar a **própria** (`/auth/change-password`) — evita um gestor passar pelo "esqueci minha senha" pra modificar a senha do colega sem a senha atual dele.

### 6.4 Email imutável
Mudar email exigiria invalidar tokens emitidos com aquele email no payload e fluxo de verificação. Por simplicidade, hoje não é editável.

---

## 7. Modelo de dados

Tabela `User` (Prisma):

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          UserRole  @default(GESTOR)
  museumId      String
  museum        Museum    @relation(fields: [museumId], references: [id])
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum UserRole {
  ADMIN
  GESTOR
}
```

JWT emitido pelo `/auth/signin`:
```json
{ "id": "...", "role": "GESTOR", "email": "...", "museumId": "...", "exp": ... }
```

---

## 8. Limitações conhecidas

| ID | Limitação | Impacto | Plano |
|---|---|---|---|
| L1 | Distinção ADMIN × GESTOR não é forçada | Qualquer gestor autenticado pode criar/desativar outros | Adicionar `requireRole('ADMIN')` middleware nas rotas de mutação |
| L2 | Sem audit log das operações | Não dá pra auditar "quem desativou João?" | Tabela `AuditLog` (LGPD Art. 37) — ver `STATUS.md` LGPD-14 |
| L3 | Email não editável | Casamento, mudança de domínio do museu | Endpoint dedicado com re-verificação |
| L4 | Sem 2FA | Senha vazada = acesso total | TOTP via app autenticador (futuro) |
| L5 | Reset de senha gera nova senha que o admin precisa comunicar fora-de-banda | Senha viaja por WhatsApp/email pessoal | Fluxo "esqueci senha" com link único por email + token de 1h |
| L6 | Sem onboarding por convite | Admin precisa definir senha temporária e compartilhar | "Convidar por email" com token de primeiro acesso |

---

## 9. Como testar localmente

Stack rodando (`http://localhost:5174` web, `http://localhost:3399` API):

1. Loga como admin no `/login`
2. Abre o dashboard, clica em **Gestores** na sidebar
3. Verifica que apareceu sua linha com badge **VOCÊ**
4. Clica **+ Adicionar gestor**, preenche `teste@mam.ba.gov.br` / `Teste 1` / `senha12345` / Gestor
5. Faz logout, tenta logar com `teste@mam.ba.gov.br` + `senha12345` — deve entrar
6. Volta pro admin → **Senha** → muda a senha do teste pra `outra123`
7. Tenta logar como `teste` com a senha antiga — deve dar 401
8. Loga com `outra123` — deve entrar
9. Volta pro admin → **Desativar** o teste → confirma → tenta logar com teste — deve dar 401

---

## 10. Próximos passos sugeridos

Em ordem de valor:

1. **Forçar role ADMIN** nas rotas de mutação (resolve L1) — 30 min
2. **AuditLog** capturando criação/desativação/reset (resolve L2 e atende LGPD-14) — 2h
3. **Convite por email com token de primeiro acesso** (resolve L5 e L6) — meio dia, exige integração SMTP
4. **2FA opcional via TOTP** (resolve L4) — meio dia
5. **Aba Configurações** com `change-password` da própria conta — 1h

---

## 11. Arquivos relevantes

| Arquivo | Propósito |
|---|---|
| `apps/api/src/controllers/UserController.ts` | Lógica de CRUD e isolamento multi-tenant |
| `apps/api/src/routes/users.routes.ts` | Roteamento Express |
| `apps/api/src/routes/index.ts` | Mount de `/users` sob `authMiddleware` |
| `apps/api/src/controllers/AuthController.ts` | Login + change-password (não confundir com /users/:id/reset-password) |
| `apps/api/prisma/schema.prisma` | Modelo `User` + enum `UserRole` |
| `apps/web/src/pages/dashboard/GestoresTab.tsx` | UI da aba |
| `apps/web/src/pages/Dashboard.tsx` | Registro da aba na sidebar |
| `apps/web/src/store/useAuthStore.ts` | Tipos `User` / `UserRole` no front |
