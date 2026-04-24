INRI Wallet deploy fix

Este pacote é da INRI Wallet, não da INRI Platform.

O build correto precisa aparecer assim no GitHub Actions:

> inri-wallet-stage@1.0.0 build
> vite build

Se aparecer isto, ainda está errado:
> shadcn-dashboard-nextjs
> next build

Estrutura correta na raiz do repositório inri-wallet-stage:

package.json
index.html
vite.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
src/
public/
.github/

O arquivo src/screens/TokenFactoryScreen.tsx precisa existir.
