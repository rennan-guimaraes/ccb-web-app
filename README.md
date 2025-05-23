# ⛪ Sistema de Gestão da Igreja

Um sistema completo para gerenciamento de dados de casas de oração e gestão administrativa de igrejas, desenvolvido com Next.js e React.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Configuração](#instalação-e-configuração)
- [Como Usar](#como-usar)
- [Funcionalidades Detalhadas](#funcionalidades-detalhadas)
- [Formato dos Dados](#formato-dos-dados)
- [Contribuição](#contribuição)

## 🎯 Sobre o Projeto

O Sistema de Gestão da Igreja é uma aplicação web moderna desenvolvida para auxiliar no gerenciamento administrativo de igrejas, especificamente no controle de:

- **Casas de Oração**: Cadastro e gerenciamento de imóveis utilizados pela igreja
- **Documentação**: Controle de documentos obrigatórios e opcionais para cada casa
- **Análises**: Relatórios e gráficos sobre a situação documental
- **Backup**: Sistema completo de exportação e importação de dados

## ✨ Funcionalidades

### 🏠 Gestão de Casas de Oração

- Importação via arquivo Excel
- Cadastro manual de novas casas
- Busca de imóveis faltantes comparando com dados de gestão
- Visualização em tabela com filtros
- Exclusão de registros

### 🔍 Detalhes da Casa (NOVO!)

- **Busca inteligente** de casas por código, nome ou endereço
- **Visualização completa** dos documentos de uma casa específica
- **Interface amigável** com busca em tempo real
- **Resumo estatístico** visual da situação documental
- **Edição de observações** e exceções diretamente na tela
- **Exportação de relatórios** em PDF com design profissional

### 📊 Gestão de Documentos

- **Importação avançada**: Sistema unificado com datas de emissão e validade
- **Consolidação inteligente**: Documentos similares (AVCB/CLCB → Bombeiros) são automaticamente agrupados
- Análise automática de documentos faltantes
- Sistema de exceções para documentos não aplicáveis
- Observações personalizadas por casa/documento
- Diferenciação entre documentos obrigatórios e opcionais
- **Controle de vencimentos**: Alertas para documentos vencidos ou a vencer
- **Compatibilidade**: Gera automaticamente dados no formato tradicional

### 📈 Análises e Relatórios

- Gráficos interativos de completude documental
- Análise detalhada de documentos faltantes
- Percentuais ajustados considerando exceções
- Filtros por tipo de documento (obrigatório/opcional)
- **Relatórios PDF individuais** por casa de oração

### 💾 Sistema de Backup

- Exportação completa de dados em formato JSON
- Importação com opção de mesclar ou substituir dados
- Versionamento e timestamp dos backups
- Validação de integridade dos arquivos

## 🛠 Tecnologias Utilizadas

### Frontend

- **Next.js 15** - Framework React com SSR/SSG
- **React 19** - Biblioteca para interfaces de usuário
- **TypeScript** - Tipagem estática para JavaScript
- **Tailwind CSS** - Framework CSS utilitário
- **shadcn/ui** - Biblioteca de componentes React

### Bibliotecas Específicas

- **xlsx** - Leitura e processamento de arquivos Excel
- **recharts** - Criação de gráficos e visualizações
- **lucide-react** - Ícones SVG otimizados
- **react-hook-form** - Gerenciamento de formulários
- **zod** - Validação de schemas TypeScript
- **jsPDF** - Geração de documentos PDF
- **html2canvas** - Captura de elementos HTML como imagem

### Armazenamento

- **localStorage** - Persistência local de dados no navegador

## 📁 Estrutura do Projeto

```
src/
├── app/                          # Páginas Next.js
│   ├── page.tsx                  # Página principal
│   ├── layout.tsx               # Layout global
│   └── globals.css              # Estilos globais
├── components/                   # Componentes React
│   ├── ui/                      # Componentes base (shadcn/ui)
│   ├── dataDisplay.tsx          # Componente principal de visualização
│   ├── gestaoConsolidada.tsx    # Sistema unificado de gestão
│   ├── casasImport.tsx          # Importação de casas de oração
│   ├── gestaoVistaImport.tsx    # Importação de dados avançados
│   ├── dataExportImport.tsx     # Sistema de backup
│   ├── chartDisplay.tsx         # Gráficos e visualizações
│   ├── documentosFaltantesAnalysis.tsx # Análise de documentos
│   ├── casaDocumentosDetail.tsx # Detalhes de documentos por casa
│   ├── relatorioExport.tsx      # Geração de relatórios PDF
│   ├── addCasaModal.tsx         # Modal para adicionar casas
│   └── buscarImovelFaltante.tsx # Busca de imóveis faltantes
├── services/                     # Lógica de negócio
│   ├── dataService.ts           # Gerenciamento geral de dados
│   ├── dataExportImportService.ts # Serviços de backup
│   └── documentosFaltantesService.ts # Gestão de documentos faltantes
├── types/                        # Definições TypeScript
│   └── casaOracao.ts            # Interfaces e tipos
├── utils/                        # Utilitários
│   └── constants.ts             # Constantes e configurações
└── lib/                         # Configurações de bibliotecas
    └── utils.ts                 # Utilitários compartilhados
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- npm, yarn, pnpm ou bun

### Passos de Instalação

1. **Clone o repositório**

```bash
git clone <repository-url>
cd church
```

2. **Instale as dependências**

```bash
npm install
# ou
yarn install
# ou
pnpm install
# ou
bun install
```

3. **Execute o projeto em desenvolvimento**

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

4. **Acesse a aplicação**

```
http://localhost:3000
```

### Build para Produção

```bash
npm run build
npm run start
```

## 🎮 Como Usar

### 1. Importação de Dados

#### Casas de Oração

1. Navegue até a aba "Casas de Oração"
2. Clique em "Importar Excel"
3. Selecione um arquivo Excel com as colunas:
   - `codigo` (obrigatório)
   - `nome` (obrigatório)
   - `tipo_imovel` (opcional)
   - `endereco` (opcional)
   - `observacoes` (opcional)
   - `status` (opcional)

#### Dados de Gestão

1. Navegue até a aba "Gestão"
2. Clique em "Importar Excel"
3. Selecione um arquivo Excel onde:
   - Os cabeçalhos estão na linha 15
   - A primeira coluna contém códigos das casas
   - Outras colunas representam documentos
   - Células marcadas com "X" indicam documentos presentes

### 2. Gestão de Documentos (Sistema Unificado)

1. **Acesse a aba "Gestão"**
2. **Escolha o modo de visualização**:
   - **Modo Cards**: Visualização avançada com controle de datas
   - **Modo Tabela**: Visualização tradicional com funcionalidades de exportação
3. **Importe dados detalhados** (Modo Cards):
   - Clique em "Importar Gestão a Vista"
   - Selecione arquivo Excel no formato específico:
     - Cabeçalho na linha 11
     - Primeiro dado na linha 13
     - Pula uma linha entre registros
     - Coluna 4: Código da casa (ex: BR 21-0332 - JARDIM DO LAGO)
     - Coluna 8: Documentos (código + descrição)
     - Coluna 14: Data de emissão
     - Coluna 16: Data de validade
4. **Monitore documentos**:
   - Visualize estatísticas de documentos vencidos e a vencer
   - Acompanhe status visual por casa de oração
   - Identifique rapidamente problemas de documentação
   - **Consolidação automática**: Documentos similares são agrupados (ex: AVCB + CLCB = Bombeiros)
5. **Use o Modo Tabela para exportação**:
   - Os dados tradicionais são gerados automaticamente após a importação
   - Ative o "Modo Export" para visualizar tabela completa
   - Configure exceções e exporte para PDF
   - Mantenha compatibilidade com análises e gráficos existentes

### 3. Detalhes da Casa

1. **Acesse a aba "Detalhes da Casa"**
2. **Busque a casa desejada**:
   - Digite parte do código, nome ou endereço no campo de busca
   - Veja os resultados aparecerem em tempo real
   - Clique na casa desejada para selecioná-la
3. **Visualize as informações**:
   - Dados completos da casa selecionada
   - Resumo estatístico visual dos documentos
   - Lista detalhada de todos os documentos com status
4. **Gerencie documentos**:
   - Adicione observações para documentos faltantes
   - Marque documentos como "desconsiderados" quando aplicável
   - Edite observações existentes
5. **Exporte relatório**:
   - Clique em "Exportar PDF" para gerar um relatório profissional
   - O arquivo será baixado automaticamente

### 4. Análise de Documentos

1. Navegue até "Documentos Faltantes"
2. Visualize a análise automática de documentos ausentes
3. Adicione observações ou marque exceções para casos específicos
4. Use filtros para focar em documentos obrigatórios

### 5. Visualização de Gráficos

1. Acesse a aba "Gráfico"
2. Ative/desative o modo de exceções
3. Visualize percentuais de completude documental

### 6. Backup e Restauração

1. Navegue até a aba "Backup"
2. **Para exportar**: Clique em "Exportar Dados"
3. **Para importar**: Selecione um arquivo JSON de backup
4. Escolha entre "Mesclar" ou "Substituir" dados existentes

## 🔧 Funcionalidades Detalhadas

### Sistema de Busca Inteligente

A nova funcionalidade de **Detalhes da Casa** inclui um sistema de busca avançado:

- **Busca em tempo real** por código, nome ou endereço
- **Resultados limitados** a 10 itens para melhor performance
- **Interface intuitiva** com ícones e informações visuais
- **Seleção fácil** com clique direto no resultado desejado

### Relatórios PDF Profissionais

Os relatórios gerados incluem:

- **Cabeçalho** com logo e informações do sistema
- **Dados da casa** (código, nome, tipo, endereço, status)
- **Resumo estatístico** visual com contadores coloridos
- **Lista de documentos** separada por obrigatórios e opcionais
- **Status visual** de cada documento (presente, faltante, desconsiderado)
- **Observações** e notas especiais
- **Design profissional** pronto para apresentação

### Sistema de Documentos

#### Sistema de Gestão Unificado

O sistema consolidado oferece todas as funcionalidades avançadas de controle documental:

- **Datas de Emissão e Validade**: Controle completo da vigência dos documentos
- **Consolidação Inteligente**: Agrupamento automático de documentos similares (AVCB + CLCB = Bombeiros)
- **Alertas Inteligentes**: Identificação automática de documentos vencidos ou a vencer em 30 dias
- **Visualização Detalhada**: Interface dedicada para análise por casa de oração
- **Compatibilidade**: Geração automática de dados no formato tradicional para análises
- **Estatísticas Visuais**: Dashboards com indicadores de status documental

#### Documentos Obrigatórios

- Alvará de Funcionamento
- Certificado do Corpo de Bombeiros
- Projeto Aprovado
- Habite-se

#### Documentos Específicos para Imóveis Próprios

- Averbação
- Escritura
- Compra e Venda

#### Documentos Suportados e Consolidação Automática

**Documentos Originais (consolidados automaticamente):**

- **1.1** - Escritura Definitiva - Compra e Venda / Permuta → **Escritura de Compra e Venda**
- **1** - Habite-se → **Habite-se**
- **3** - Alvará/Licença de Funcionamento → **Alvará de Funcionamento**
- **5** - CLCB - Certificado de Licença Corpo de Bombeiros → **Bombeiros**
- **4** - AVCB - Auto de Vistoria do Corpo de Bombeiros → **Bombeiros**
- **1** - Projeto Aprovado pela Prefeitura → **Projeto Aprovado**
- **2** - Certificado de Regularização → **Certificado de Regularização**
- **2** - Averbação da Construção na Matrícula → **Averbação de Construção**
- **4.1** - Sentença de Usucapião → **Sentença de Usucapião**
- **2.3** - Instrumento Particular - Cessão de Direitos Hereditários → **Cessão Hereditária Particular**
- **5.1** - Contrato de Aluguel → **Contrato de Aluguel**
- **3** - SCPO - Sistema de Comunicação Prévia de Obras → **SCPO**
- **2.2** - Instrumento Particular - Cessão de Posse → **Cessão de Posse Particular**

**Consolidação Inteligente:**

- Documentos similares são automaticamente agrupados (ex: AVCB + CLCB = Bombeiros)
- Sistema identifica e trata documentos que só se aplicam a imóveis próprios (códigos "IP")
- Compatibilidade total com análises e gráficos existentes

### Sistema de Exceções

Permite marcar documentos como "desconsiderados" quando:

- Não se aplicam ao tipo de imóvel
- Existem circunstâncias especiais
- Há observações específicas registradas

### Análise Inteligente

- **Percentual Original**: Baseado apenas em documentos marcados como presentes
- **Percentual Ajustado**: Considera exceções como documentos "presentes"
- **Observações**: Sistema de comentários por casa/documento
- **Responsabilidade**: Rastreamento de quem fez observações

## 📄 Formato dos Dados

### Casa de Oração

```typescript
interface CasaOracao {
  codigo: string; // Código único da casa
  nome: string; // Nome da casa de oração
  tipo_imovel?: string; // Tipo do imóvel (IP - próprio, etc.)
  endereco?: string; // Endereço completo
  observacoes?: string; // Observações gerais
  status?: string; // Status atual (ativo, inativo, etc.)
}
```

### Dados de Gestão

```typescript
interface GestaoData {
  codigo: string; // Código da casa (chave)
  [key: string]: string; // Documentos como colunas dinâmicas
}
```

### Backup do Sistema

```typescript
interface SystemBackup {
  version: string; // Versão do sistema
  timestamp: string; // Data/hora do backup
  data: {
    casas: CasaOracao[];
    gestao: GestaoData[];
    documentos_faltantes: DocumentoFaltante[];
  };
}
```

## 🎨 Interface

### Características da UI

- **Design Responsivo**: Funciona em desktop, tablet e mobile
- **Tema Moderno**: Interface limpa usando Tailwind CSS
- **Componentes Acessíveis**: Baseados em shadcn/ui
- **Feedback Visual**: Estados de loading, sucesso e erro
- **Navegação por Abas**: Organização intuitiva das funcionalidades
- **Busca Inteligente**: Campo de busca com resultados em tempo real

### Paleta de Cores

- **Azul**: Elementos principais e navegação
- **Verde**: Sucesso e dados corretos
- **Vermelho**: Erros e dados faltantes
- **Amarelo**: Avisos e informações importantes
- **Cinza**: Elementos neutros e backgrounds

## 📊 Recursos de Análise

### Gráficos Disponíveis

- **Barras Horizontais**: Completude por tipo de documento
- **Percentuais**: Progresso visual por categoria
- **Cores Dinâmicas**: Indicação visual do status

### Filtros e Buscas

- Filtro por documentos obrigatórios
- Busca textual por nome de documento
- **Busca inteligente de casas** por código, nome ou endereço
- Ordenação automática por prioridade

### Relatórios

- **Relatórios individuais** em PDF por casa de oração
- **Exportação completa** do sistema em JSON
- **Design profissional** para apresentações

## 🔒 Segurança e Privacidade

- **Armazenamento Local**: Dados ficam apenas no navegador do usuário
- **Sem Servidor**: Não há envio de dados para servidores externos
- **Backup Manual**: Usuário controla quando e onde fazer backups
- **Validação de Dados**: Verificação de integridade nos imports

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- Use TypeScript para tipagem forte
- Siga as convenções do ESLint configurado
- Componentes em PascalCase
- Funções e variáveis em camelCase
- Comentários em inglês no código

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou suporte:

- Abra uma issue no repositório
- Consulte a documentação das tecnologias utilizadas
- Verifique os logs do console do navegador para debugging

---

**Desenvolvido com ❤️ para auxiliar na gestão administrativa de igrejas**
