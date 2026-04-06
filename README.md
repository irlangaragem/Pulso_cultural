# Pulso Cultural: Socio-Technical Architecture

## Visão do Projeto
O Pulso Cultural é uma plataforma de inteligência de público para museus, focada na transição de dados para insights comportamentais em tempo real.

## Arquitetura de Fluxo (SESA)
O sistema opera em um modelo monorepo filtrado:
- **apps/api**: Atua como uma camada de agregação e proxy inteligente (*BFF - Backend for Frontend*). 
    - Atualmente, as métricas de dashboard são orquestradas da API de produção via `DashboardController`.
    - **Caching**: Implementamos proteção de infraestrutura com TTL de 30s para evitar doS em APIs externas.
- **apps/web**: Interface de UX reativa com foco em maturidade cognitiva e feedback imediato.

## Gestão de Conhecimento (ACE)
- **Cultura de Evolução**: O projeto evolui em fases incrementais (Fases de UX 1-7).
- **Contratos de Dados**: Respostas de APIs externas são validadas em runtime via **Zod** para garantir integridade.
- **Resiliência**: O frontend possui Error Boundaries granulares para isolar falhas de integração.

## Como Contribuir
1. Valide contratos no `apps/api/src/schemas`.
2. Verifique o impacto de performance no polling do Dashboard.
3. Garanta que o `Bus Factor` seja mitigado através de documentação atualizada em cada PR.
