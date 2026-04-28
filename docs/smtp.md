# Configuração SMTP — Convites e emails transacionais

Como ligar o envio de email automático no Pulso Cultural. Hoje o único uso é o **convite de gestor** (aba Gestores → Convidar usuário), mas o `EmailService` foi escrito pra suportar mais tipos de email (recuperação de senha, notificações de evento, etc.) sem mudanças de infra.

---

## 1. Quando configurar (e quando não)

SMTP é **opcional**.

- **Sem SMTP**: o convite ainda funciona. Quando o admin clica "Convidar usuário", o sistema gera o link e mostra num modal pra ele copiar e enviar manualmente (WhatsApp, Telegram, Slack…).
- **Com SMTP**: o link é enviado por email automaticamente. O modal continua mostrando o link como fallback caso o gestor queira reenviar.

Configura SMTP quando:
- O museu vai onboarding ≥ 3 pessoas
- Você não quer ter que copiar/colar link manualmente
- Vai ter convites recorrentes (estagiários, mediadores temporários, etc.)

Pode pular SMTP se:
- O museu tem só 1–2 gestores fixos
- Está em fase de POC e não quer dependência externa
- O admin sempre está perto pra enviar manualmente

---

## 2. Escolha do provedor

Pra MVP / volume baixo (≤ 300 convites/mês):

| Provedor | Free tier | Setup | Indicado pra |
|---|---|---|---|
| **Resend** | 100/dia, 3000/mês | 5 min | **Recomendado**. Moderno, API limpa, deliverability boa |
| **Brevo** (ex-Sendinblue) | 300/dia | 10 min | Volume médio, interface PT-BR |
| **SendGrid** | 100/dia | 10 min | Padrão de mercado, mais burocrático |
| **Gmail SMTP** | 500/dia (Google) | 5 min | Quick & dirty pra dev, "do email do gerente" |
| **Amazon SES** | $0.10/1k | 30 min (sandbox → produção) | Volume alto, integração AWS |
| **Mailgun** | trial 5k em 30d | 10 min | Pago só, migração de SendGrid |

### Recomendação por contexto

- **Piloto MAM-BA**: Resend free tier. Verifica o domínio `mam.ba.gov.br` (ou `garagem.dev.br` da equipe técnica), 100 convites/dia é mais que suficiente.
- **Sem domínio próprio ainda**: Resend dá o subdomínio `onresend.dev` pra usar enquanto você arruma o DNS.
- **Quer um caminho de fuga rápido**: Gmail SMTP com app password — não recomendado pra produção, mas funciona em 2 minutos.

---

## 3. Como pegar credenciais

### Resend (recomendado)

1. Cria conta em https://resend.com
2. **Domains → Add Domain** com `mam.ba.gov.br` (ou seu domínio). Resend mostra os 3 registros DNS pra adicionar (SPF, DKIM x2). Aguarda verificação (~10 min).
   - Pra teste rápido sem domínio: pula esse passo e usa `from=onresend.dev` (limita 100 emails)
3. **API Keys → Create API Key** → escopo "Full access" → copia (`re_xxxxxxxxxxxxxxxxxxxx`).
4. Valores SMTP fixos:
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx
   ```

### Gmail (rápido pra dev)

1. Conta Gmail com **verificação em 2 etapas ativada** (obrigatório).
2. https://myaccount.google.com/apppasswords → "Select app: Other" → nomeia "Pulso Cultural" → **Generate**.
3. Copia os 16 caracteres (sem espaços).
4. Valores:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu.email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop   ← cole sem espaços
   ```
5. **Limitação**: o email vai sair como `From: seu.email@gmail.com` mesmo se `SMTP_FROM` apontar pra outro domínio. Gmail força o sender ao endereço autenticado.

### Brevo

1. Conta em https://www.brevo.com → confirma email.
2. **SMTP & API → SMTP** (sidebar esquerda).
3. **Generate a new SMTP key** → Brevo mostra `Login: xxxx@smtp-brevo.com` + `Master Password`.
4. Valores:
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=xxxx@smtp-brevo.com
   SMTP_PASS=master-password-aqui
   ```

### SendGrid

1. Conta em https://signup.sendgrid.com.
2. **Settings → API Keys → Create API Key** → "Mail Send" full access.
3. Valores:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey               ← literal, palavra "apikey"
   SMTP_PASS=SG.xxxxxxxxxxxxxxxxx  ← a chave gerada
   ```

### Amazon SES

1. Console SES → **SMTP Settings → Create SMTP Credentials** (gera IAM user automaticamente).
2. Verifica o domínio do `SMTP_FROM` em **Verified identities**.
3. Valores:
   ```
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com  ← região da sua conta
   SMTP_PORT=587
   SMTP_USER=AKIAxxxxxxxxxxxxxxx
   SMTP_PASS=BLxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Se a conta estiver em **sandbox** (padrão pra contas novas), só dá pra enviar pra emails verificados. Pede saída do sandbox no console quando quiser produção.

---

## 4. Configuração no Pulso Cultural

### 4.1 Variáveis necessárias

Adiciona no `.env` da API (`apps/api/.env`) — ou no painel **Variables** do Railway pro deploy:

```bash
# SMTP — todas obrigatórias quando SMTP estiver ativo
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=0                 # "1" só pra porta 465 (SSL puro). "0" pra 587/STARTTLS.
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx

# "From" do email. O domínio precisa estar verificado no provedor.
SMTP_FROM=Pulso Cultural <noreply@mam.ba.gov.br>

# Já existe — é usada pra montar a URL do convite que entra no email.
# Em prod, aponta pro front público (não localhost).
WEB_URL=https://pulsocultural.art
```

### 4.2 Reinicia a API

Local:
```bash
# Matar processo na porta da API e religar
netstat -ano | findstr :3399
taskkill /F /PID <pid>
cd apps/api && npm run dev
```

Railway: salvar as envs no painel já dispara redeploy automático.

### 4.3 Como saber se ligou

Quando você cria um convite:

- **Modal mostra**: *"Enviamos um email para X"* → SMTP **funcionou** ✅
- **Modal mostra**: *"SMTP não está configurado, copie o link"* → API não leu as envs ❌

No log da API:
```
[email] invite sent to ana@mam.ba.gov.br
```
↑ enviado de fato.

```
[email:mock] invite for ana@mam.ba.gov.br: http://localhost:5174/aceitar-convite?token=...
```
↑ SMTP não configurado, link logado pra debug.

```
[email] failed to send invite: Authentication failed
```
↑ SMTP configurado mas credenciais erradas.

---

## 5. Domínio próprio: SPF + DKIM + DMARC

Sem isso o email vai pra spam. Resend, SendGrid, Brevo e SES mostram os registros DNS pra adicionar — **adicione todos**.

Exemplo (Resend):

| Tipo | Nome | Valor |
|---|---|---|
| MX | send | `feedback-smtp.us-east-1.amazonses.com` (prioridade 10) |
| TXT | send | `"v=spf1 include:amazonses.com ~all"` |
| TXT | resend._domainkey | (chave longa que o Resend gera) |
| TXT | _dmarc | `"v=DMARC1; p=none;"` (mínimo) |

Aguarda 10–60 min pra propagar. Resend mostra "Verified" verde quando OK.

Pra testar deliverability, envia pra https://www.mail-tester.com/ → cola o link que ele dá no `SMTP_FROM` por uma vez → score 8+/10 é bom.

---

## 6. Troubleshooting

### "SMTP não está configurado" mesmo com `.env` preenchido
- A API foi iniciada antes do `.env` mudar. Mate o processo e religue.
- Verifica se o `.env` está em `apps/api/.env` (não só na raiz). O `dotenv` lê do `cwd`.
- Em Railway: confirma que as envs estão **salvas e o serviço reiniciou**.

### `ECONNREFUSED` no log da API
- `SMTP_HOST` ou `SMTP_PORT` errados. Confere com a doc do provedor.
- Firewall/proxy bloqueando saída na porta 587 ou 465.

### `535 Authentication failed`
- `SMTP_USER`/`SMTP_PASS` errados.
- Gmail: usou a senha normal em vez da App Password? Não funciona — precisa criar App Password.
- Resend: copiou a chave inteira (começa com `re_`)?
- SendGrid: o `SMTP_USER` é literal a palavra `apikey`, não seu email.

### Email vai pra spam
- Domínio do `SMTP_FROM` **não está verificado** no provedor.
- Falta SPF/DKIM/DMARC nos DNS.
- "Reply-To" diferente do "From".
- Conteúdo HTML com muitos links externos (não é o caso aqui).

### `connection timeout` no Railway
- Railway às vezes bloqueia porta 25. Use **587** (STARTTLS) — é o padrão na nossa config.
- Algumas regiões podem precisar de `SMTP_PORT=2525` se 587 estiver bloqueado.

### O link no email aponta pra `localhost:5174`
- A env `WEB_URL` está com valor de dev. Em produção define `WEB_URL=https://pulsocultural.art` (ou o que for o front público).
- Reiniciar a API depois de mudar.

### Email chega, link abre, mas dá "convite inválido ou expirado"
- O token vive em **memória** (ver `apps/api/src/services/InviteService.ts`). Se a API foi reiniciada entre o envio e a tentativa de aceite, o token sumiu.
- Solução: admin clica **Reenviar** na lista. Ou, melhor: aplicar a migration que persiste convites na tabela `UserInvite` (pendente de aprovação na DB do Railway).

---

## 7. Templates de email

O HTML do convite está em `apps/api/src/services/EmailService.ts`, função `inviteHtml`. Pra editar:

- Cores e tipografia: `linear-gradient(135deg, #E8554E, #D4267E)` é o gradiente padrão do produto
- O link tem fallback em texto puro caso o cliente bloqueie HTML
- Sempre inclui versão `text/plain` no `transporter.sendMail` (clientes corporativos exigem)

Ao adicionar novos tipos de email (ex: recuperação de senha), siga o mesmo padrão:
1. Adiciona método em `EmailService` (ex: `sendPasswordReset`)
2. HTML inline, sem dependência de template engine
3. Sempre retorna `boolean` — `true` quando saiu, `false` quando logou-fallback

---

## 8. Custos esperados (piloto MAM-BA)

Cenário: 1 museu, ~10 gestores no total ao longo do ano, 3-5 convites/mês, eventuais lembretes operacionais.

| Provedor | Custo/mês esperado |
|---|---|
| Resend free tier | **R$ 0** (até 3000/mês) |
| Brevo free tier | **R$ 0** (até 9000/mês) |
| Gmail SMTP | **R$ 0** (limite 500/dia) |
| SES | ~R$ 0,01/mês (10 emails) |

Pra qualquer cenário de pilot, free tier é suficiente. Pague só quando o produto for multi-tenant (vários museus, milhares de visitantes recebendo email de "lembrete da exposição") — aí avalia.

---

## 9. Checklist de produção

Antes de ligar SMTP em produção:

- [ ] Domínio do `SMTP_FROM` verificado no provedor
- [ ] SPF + DKIM + DMARC configurados no DNS
- [ ] `WEB_URL` aponta pro front público (não localhost)
- [ ] `SMTP_PASS` salvo só nas envs do Railway, **nunca** commitado
- [ ] Teste com mail-tester.com → score ≥ 8
- [ ] Teste de envio real com email pessoal → recebido em <1 min, não em spam
- [ ] Teste de fluxo completo: convidar → email → aceitar → logado
- [ ] Plano B documentado: se SMTP cair, admin sabe que pode copiar o link do modal

---

## 10. Arquivos relevantes

| Arquivo | Propósito |
|---|---|
| `apps/api/src/services/EmailService.ts` | Wrapper do `nodemailer`, fallback de log se SMTP off |
| `apps/api/src/services/InviteService.ts` | Geração e validação de tokens |
| `apps/api/src/controllers/InviteController.ts` | Endpoints públicos `/invites/info`, `/invites/accept` |
| `apps/api/src/controllers/UserController.ts` | `create` (gera convite), `resendInvite`, `revokeInvite` |
| `apps/web/src/pages/AcceptInvite.tsx` | Página pública onde o convidado define a senha |
| `.env.example` | Template das variáveis SMTP |
