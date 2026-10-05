# 🏴‍☠️ Pirate Battle - PixiJS + React Game

Um jogo 2D de temática pirata desenvolvido com foco em alta performance, combinando um motor gráfico robusto baseado em **PixiJS** para o loop de jogo (60 FPS) e **React + Zustand** para o gerenciamento da interface e menus.

O projeto foi estruturado de forma modular para isolar a física e a renderização gráfica da camada de interface de usuário (HUD e menus).

---
### 🗺️ Próximas Etapas & Roadmap
* [ ] Testes com Playwright
* [ ] Editor de Mapas com UI
* [ ] Efeitos sonoros e trilha sonora pirata customizada.
* [ ] Power-ups espalhados pelo mapa (reparação de casco e tiro triplo).
* [ ] Boss
* [ ] Animações

---

## 🚀 Funcionalidades e Recursos Implementados
* [x] Ajustes para Responsividade
* [x] Persistência de ranking com LocalStorage ou backend simples.
* [x] Match History
* [x] Menu Options funcional
* [x] Telas de Gameover e Pause
* [x] Novos tipos de inimigos (Chaser / Boss).

### 🎮 Motor de Jogo & Física (`PixiJS` / `Core`)
* **Estrutura Modular:** Separação clara entre a lógica do motor (`src/core/`) e a interface (`src/ui/`).
* **Geração Procedural de Mapa:** Sistema de mundos baseados em *Seed* para distribuição consistente de ilhas e elementos.
* **Mapeamento de Sprites:** Utilização de *Tilesheets* e *Spritesheets* para otimização gráfica.
* **Sistema de Movimentação e Física:** Controle fluido do navio do jogador com tratamento de colisões.
* **Inteligência Artificial (IA) de Inimigos:** 
  * Modo *Shooter* (perseguição ao jogador e atirador).
  * Comportamento de fuga/desvio de ilhas para evitar colisões estáticas.
* **Sistema de Combate:** Mecânica de disparos frontais e controle de dano/vida para o jogador e embarcações inimigas.
* **Gerenciador de Spawn:** Sistema dinâmico configurável para controle de taxa de surgimento (*respawn rate*) e limite máximo de inimigos simultâneos.
* **2 modos de ataques - Frontal e Lateral implementados

### 🖥️ Interface & Menus (`React` + `Zustand`)
* **Gerenciamento de Estado Global:** Utilização do Zustand para controle fluído de telas, modais e opções.
* **Menu Principal:** Tela com logotipo temático e navegação rápida para Play, Options e Ranking.
* **Tela de Configurações (Options):** Ajustes dinâmicos para tempo total de partida, limite de inimigos e taxa de spawn.
* **Hall da Fama (Ranking):** Tabela de pontuações exibindo posição, nome do capitão, tempo de sobrevivência e inimigos derrotados.
* **Menu de Pause & Game Over:** Atalhos de controle de fluxo de jogo (*Resume*, *Ranking*, *Main Menu*).
* **HUD Dinâmica:** Interface sobreposta otimizada para exibição de tempo restante e pontuação sem comprometer a performance do motor gráfico.

---

## 🛠️ Tecnologias Utilizadas

* **[Vite](https://vitejs.dev/)** - Empacotador e ambiente de desenvolvimento ultrarrápido.
* **[React](https://react.dev/)** - Construção de componentes de interface e menus.
* **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática para maior segurança e escalabilidade.
* **[PixiJS](https://pixijs.com/)** - Motor gráfico 2D de alta performance renderizado via WebGL.
* **[Zustand](https://github.com/pmndrs/zustand)** - Gerenciamento de estado leve e eficiente.

---

## ⚙️ Como Executar o Projeto Localmente

Siga os passos abaixo para rodar o projeto na sua máquina:

1. **Clone o repositório:**
2. Instale as dependências e execute:

```
Bash
npm install
```
3. Inicie o servidor de desenvolvimento:

```
Bash
npm run dev
```
4. Acesse no navegador através do endereço fornecido pelo Vite, geralmente em:
   
```
http://localhost:5173
```
