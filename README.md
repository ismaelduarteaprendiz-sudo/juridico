# Controle de Processos — OP Casos

Webapp 100% funcional para acompanhar os 560 processos (OP_Casos + OP_Log)
do arquivo `OP_Casos_Base_v2.xlsx`. Roda inteiramente no navegador — sem
servidor, sem banco de dados externo, sem custo.

## Como rodar

**Opção 1 — Abrir direto (mais simples)**
Dê duplo clique em `index.html`. Funciona offline, os dados já vêm
carregados dentro do próprio arquivo.

**Opção 2 — Servidor local (recomendado para editar/testar)**
```bash
cd app
python3 -m http.server 8000
# depois abra http://localhost:8000
```

**Opção 3 — Deploy gratuito**
Arraste a pasta `app/` para [Netlify Drop](https://app.netlify.com/drop),
ou publique via **GitHub Pages** (suba a pasta para um repositório e
ative Pages apontando para a raiz). Não é necessário backend nem build.

## Estrutura dos arquivos

```
app/
├── index.html      # estrutura da página
├── style.css       # visual
├── app.js          # toda a lógica (filtros, edição, import/export)
├── data.js         # dados de OP_Casos_Base_v2.xlsx já convertidos e prontos
└── vendor/
    └── xlsx.full.min.js   # biblioteca SheetJS (leitura/escrita de .xlsx), 100% local
```

Nenhuma dependência externa é baixada em tempo de execução — tudo já
está no pacote.

## Uso rápido

- **Abas**: "Casos Ativos" mostra o conteúdo de OP_Casos; "Histórico" mostra OP_Log.
- **Busca**: campo de texto livre busca em processo, autor e observações.
- **Filtros**: status, instituição, comarca, advogado e faixas de data
  (entrada no estágio / prazo).
- **Ordenar**: clique no cabeçalho de qualquer coluna visível.
- **Colunas**: botão "Colunas" abre um painel para marcar/desmarcar quais
  das 31 colunas aparecem na tabela (por padrão só as mais usadas ficam
  visíveis, para manter a tabela legível — todas as 31 continuam
  disponíveis a qualquer momento).
- **Editar**: clique em statusPagamento, status, advogado, prazo ou
  observações para editar direto na célula. Status só aceita os 6 valores
  válidos (Notificação, Em andamento, Sentenciado ou Acordo, Recurso,
  Concluído, Arquivado). Alterações são salvas automaticamente no
  navegador (IndexedDB) — persistem mesmo fechando a aba.
- **Total Sentenciado**: coluna calculada automaticamente
  (valorSentenciado + valorAcordo + contribuições previdenciárias +
  custas judiciais + depósito recursal + IRPF/outros + honorários).
- **Exportar tudo**: gera um .xlsx com as duas abas completas (OP_Casos e
  OP_Log), preservando cabeçalho e legenda originais.
- **Exportar filtrado**: gera um .xlsx só com os processos visíveis com
  os filtros/aba atuais.
- **Importar XLSX**: permite carregar uma nova versão da planilha
  (mesma estrutura de 31 colunas). A linha de exemplo (3ª linha,
  amarela) é sempre descartada automaticamente. Processos duplicados são
  detectados e avisados, mas não bloqueiam a importação.
- **Restaurar dados originais**: volta para os dados exatamente como
  vieram no `OP_Casos_Base_v2.xlsx` enviado, descartando qualquer edição
  feita no navegador.

## Persistência

Os dados ficam salvos no **IndexedDB do navegador** (local, gratuito, sem
servidor). Isso significa:
- As edições persistem entre sessões, mas **apenas neste navegador e
  neste computador**.
- Para compartilhar o estado atual com outra pessoa/computador, use
  **Exportar tudo** e envie o .xlsx gerado, ou publique o app com um
  backend próprio se precisar de dados compartilhados em tempo real
  entre vários usuários (fora do escopo gratuito/sem-servidor pedido).
- Limpar o cache/dados do site no navegador apaga o IndexedDB — use
  "Exportar tudo" antes se quiser manter as alterações.

## ⚠️ Observações sobre a qualidade dos dados de origem

Ao importar `OP_Casos_Base_v2.xlsx` encontrei alguns pontos que vale a
pena revisar na planilha original:

1. **10 linhas corrompidas em OP_Casos (linhas 53–62 da aba, IDs 50–59)**
   continham o que parece ser uma tabela-resumo (contagem de processos
   por vara, com percentuais) colada por engano dentro das colunas de
   dados de processo — por exemplo, a coluna "processo" continha o texto
   "1ª do Trabalho" em vez de um número de processo. Essas 10 linhas
   **foram excluídas automaticamente** da importação (por isso o app
   mostra 213 processos ativos "reais", não 223 — a diferença de 10 é
   exatamente essa tabela-resumo). Se alguma dessas linhas deveria
   representar um processo real, será necessário corrigi-la na planilha
   de origem e reimportar.
2. **Alguns números de processo fora do padrão CNJ** (ex.: com pontuação
   trocada, dígitos faltando, ou dois processos anotados na mesma
   célula) — cerca de 19 casos em OP_Casos e 11 em OP_Log. Foram
   importados como estão (não bloqueiam o uso do app), mas convém
   revisar caso a caso.
3. **3 registros em OP_Log com valor de "status" fora do padrão**
   esperado (frases livres em vez de um dos 6 status válidos). Também
   foram importados como estão para não perder informação; ao editar
   esses registros pela tabela, o valor será substituído por um dos 6
   status válidos (a validação passa a valer a partir da primeira
   edição).

Nenhum desses pontos impede o funcionamento do app — são só avisos para
quem for revisar a base de dados.

## Requisitos técnicos atendidos

- Sem dependências pagas ou proprietárias.
- SheetJS (`xlsx`) para leitura/escrita de `.xlsx`, vendorizado localmente.
- IndexedDB como banco local (sem servidor).
- Deploy estático gratuito (Netlify Drop, GitHub Pages, ou qualquer
  servidor de arquivos estáticos).
- Responsivo em desktop e tablet.
