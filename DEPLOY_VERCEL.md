# Deploy do ZENIX BOOST na Vercel

Este projeto foi adaptado para rodar na Vercel mantendo o backend (banco, auth, edge functions, IA generativa) hospedado no Lovable Cloud.

## ✅ Arquitetura final

- **Frontend + SSR** → Vercel (este repositório)
- **Banco de dados (Postgres)** → Lovable Cloud (Supabase)
- **Autenticação** → Lovable Cloud
- **Edge Functions** (`generate-ad`, `boost-ad`, `auto-boost-runner`, `admin-delete-user`, `zenix-ai-admin`) → Lovable Cloud
- **IA generativa** (Lovable AI Gateway) → Lovable Cloud

> O Lovable Cloud é acessado por HTTP — funciona perfeitamente do frontend hospedado na Vercel.

---

## 📋 Passo a passo

### 1) Subir o código para o GitHub

No editor do Lovable, clique em **GitHub → Connect to GitHub** e exporte o projeto para um repositório seu.

### 2) Criar projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new).
2. Importe o repositório do GitHub.
3. **Framework Preset**: deixe em "Other" (o `vercel.json` já configura tudo).
4. **Build Command**: `npm run build` (já configurado).
5. **Output Directory**: `.output/public` (já configurado).

### 3) Configurar variáveis de ambiente na Vercel

Em **Project Settings → Environment Variables**, adicione **TODAS** as variáveis abaixo (marque os 3 ambientes: Production, Preview, Development):

| Nome | Valor | Tipo |
|------|-------|------|
| `VITE_SUPABASE_URL` | `https://jltipylfxmthuxsybltt.supabase.co` | Pública |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (veja `.env.example`) | Pública |
| `VITE_SUPABASE_PROJECT_ID` | `jltipylfxmthuxsybltt` | Pública |
| `SUPABASE_URL` | `https://jltipylfxmthuxsybltt.supabase.co` | Server |
| `SUPABASE_PUBLISHABLE_KEY` | (mesmo valor de `VITE_SUPABASE_PUBLISHABLE_KEY`) | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | (pegar no painel Lovable Cloud → Backend → API) | **🔒 Secreta** |

> **⚠️ NUNCA** commit do `SUPABASE_SERVICE_ROLE_KEY` no repositório.

### 4) Deploy

Clique em **Deploy**. O primeiro build leva ~2 min. Depois disso, cada `git push` na branch principal dispara um deploy automático.

### 5) Domínio personalizado (opcional)

Em **Project Settings → Domains**, adicione seu domínio e configure os DNS apontando para a Vercel (ela mostra os registros).

---

## 🔄 Continuar editando no Lovable

Você pode continuar editando no Lovable normalmente:

- O Lovable continua funcionando normalmente (preview, edição via chat, etc).
- Quando quiser publicar mudanças na Vercel, faça push do repo no GitHub — a Vercel detecta e faz o redeploy.
- Alternativamente, mantenha o **Publish do Lovable** ativo como fallback (`zenixboostai.lovable.app`).

---

## ⚙️ Cron job (auto-boost)

A função `auto-boost-runner` continua rodando no Lovable Cloud. Se quiser disparar pela Vercel Cron, crie em `vercel.json`:

```json
"crons": [
  {
    "path": "/api/auto-boost",
    "schedule": "0 */6 * * *"
  }
]
```

E uma rota `app/routes/api/auto-boost.ts` que invoque a edge function. **Por padrão, mantenha como está** — o Lovable Cloud já cuida disso.

---

## ❓ Problemas comuns

- **"Missing Supabase environment variables"** → você esqueceu de adicionar as variáveis na Vercel. Re-deploy depois de salvar.
- **404 em refresh de página** → verifique que o `vercel.json` está na raiz do repo (já está).
- **Imagens/assets sem cache** → o `vercel.json` já configura cache imutável em `/assets/*`.
