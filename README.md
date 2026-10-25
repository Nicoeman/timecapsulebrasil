# Time Capsule Magazines Brasil

Página em português brasileiro, construída com React, TypeScript, Vite e Tailwind CSS. Inclui imagens e fontes locais, layout responsivo e checkouts Lowify dos planos Básico e Completo.

## Desenvolvimento

Requer Node.js 22 ou superior e pnpm 10.11.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Validação e produção

```sh
pnpm test
pnpm build
pnpm preview
```

A saída de produção fica em `dist/`. A configuração da Vercel está em `vercel.json`.

## Configuração comercial

Os links de checkout e as opções comerciais ficam em `src/config.ts`. Os links de compra preservam parâmetros de campanha. Informações comerciais condicionais e o cronômetro mantêm as configurações da versão aprovada. O envio dos checkouts não implica confirmação das demais condições comerciais.

Nenhuma credencial é necessária no navegador. Não publique arquivos `.env`, dados de autenticação ou diretórios de ferramentas locais.
