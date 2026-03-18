# Guia de Deploy no Railway - Pulso Cultural

Este projeto está configurado para deploy automático no Railway usando o sistema de Monorepo.

## Configuração Recomendada

Para que o deploy funcione corretamente, você deve criar **dois serviços** no Railway apontando para este mesmo repositório:

### 1. Serviço da API (Backend)
- **Root Directory:** `apps/api`
- **Build Command:** `npm run build`
- **Start Command:** `npm run start` (Isso executará as migrações do Prisma automaticamente)
- **Variáveis de Ambiente Necessárias:**
  - `DATABASE_URL`: Link do seu banco Postgres (pode ser o do Railway)
  - `JWT_SECRET`: Uma string aleatória e segura
  - `PORT`: 3333 (ou a que preferir)

### 2. Serviço Web (Frontend)
- **Root Directory:** `apps/web`
- **Build Command:** `npm run build`
- **Start Command:** `npm run start`
- **Variáveis de Ambiente Necessárias:**
  - `VITE_API_URL`: A URL pública gerada para o seu serviço de API acima.

## Banco de Dados
Adicione um serviço de **PostgreSQL** no seu projeto do Railway. O Railway injetará a `DATABASE_URL` automaticamente se você conectar os serviços.

## Notas Técnicas
- O arquivo `package.json` da API agora contém um script `postinstall` que gera o cliente Prisma automaticamente após a instalação das dependências.
- O script `start` da API executa `prisma migrate deploy` antes de subir o servidor, garantindo que o banco esteja sempre atualizado.
