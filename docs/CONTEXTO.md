# Contexto do projeto — Site De Cilios

## Stack
- Vite + React 19 + Tailwind CSS 4 (plugin @tailwindcss/vite).
- Build: `vite build` → pasta `dist`. Publicado na Vercel (todo push no branch principal vira deploy).

## Estrutura
- `index.html` — casca da página (título do site aqui).
- `src/main.jsx` — entrypoint React.
- `src/App.jsx` — página única atual (hero inicial).
- `src/index.css` — só o `@import "tailwindcss"`; estilos via classes utilitárias.

## Convenções
- Estilo com classes Tailwind direto no JSX; tema escuro (zinc) com acento emerald.
- Componentes novos em `src/components/` (criar a pasta quando precisar).
- Páginas novas: instalar `react-router-dom` no package.json e criar `src/pages/`.
