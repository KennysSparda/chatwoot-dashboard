# Documentação do Projeto: Chatwoot Dashboard

## 📌 Visão Geral

O **Chatwoot Dashboard** é um painel de controle (_Gestão à Vista_) desenvolvido em **Next.js** e **TypeScript** para monitorar, centralizar e exibir métricas de atendimento ao cliente em tempo real integradas à API do **Chatwoot**.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** Next.js (Pages Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Ícones:** Lucide React

---

## 📂 Estrutura de Diretórios e Arquivos Principais

- **`lib/chatwoot.ts`**: Cliente de integração com a API do Chatwoot. Realiza chamadas para as versões v1 e v2, paginação automática de conversas, cálculo de métricas de agentes, filas e assistente de IA (ANA).
- **`pages/index.tsx`**: Página principal do dashboard. Contém os cards estatísticos principais, mini cards secundários de acompanhamento, listagem de agentes e conversas recentes.
- **`pages/login.tsx`**: Tela de autenticação restrita para o time de suporte.
- **`components/`**: Componentes reutilizáveis da interface:
  - `Logo.tsx`: Exibição da logo oficial da empresa.
  - `StatCard.tsx`: Cards de estatísticas padronizados.
  - `AgentGoalCard.tsx`: Card de acompanhamento de metas dos agentes online.
  - `AgentTable.ts` / Outros: Tabelas e elementos visuais de suporte.
- **`public/`**: Arquivos públicos e estáticos, incluindo a logo da empresa.

---

## ⚡ Principais Funcionalidades

1. **Painel em Tempo Real (Gestão à Vista):**
   - Acompanhamento do status dos agentes (online, ocupados, offline).
   - Contagem de conversas abertas, pendentes (como chats da IA ANA), não atribuídas e resolvidas nos últimos 7 dias.

2. **Métricas de Atendimento e Filas:**
   - Monitoramento do tempo de espera dos clientes na fila.
   - Identificação da conversa com o maior tempo de espera e o agente responsável.

3. **Métricas de Desempenho dos Agentes:**
   - Cálculo de tempo médio de primeira resposta, tempo de resolução e total de conversas tratadas.

4. **Segurança e Acesso:**
   - Sistema de login protegido por senha gerenciada via API interna (`/api/login`), garantindo acesso restrito aos dados de suporte.

---

## 🚀 Como Executar o Projeto

1. Instale as dependências:

```bash
npm install
```

2. Copie o .env.example para .env e configure as variáveis de ambiente necessárias (credenciais da API do Chatwoot e token de acesso).

```bash
cp .env.example .env
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Gere a build de produção:

```bash
npm run build
```
