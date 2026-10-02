// src/core/seedRandom.ts

export class SeedRandom {
    private seed: number;
  
    constructor(seedInput: string | number) {
      this.seed = this.hashString(seedInput);
    }
  
    // Converte string ou número em um hash numérico inicial
    private hashString(str: string | number): number {
      let hash = 0;
      const strVal = String(str);
      for (let i = 0; i < strVal.length; i++) {
        const char = strVal.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Converte para inteiro de 32 bits
      }
      return Math.abs(hash);
    }
  
    // Retorna um número pseudo-aleatório entre 0 e 1 (substituto do Math.random)
    public next(): number {
      let t = (this.seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  
    // Retorna um número inteiro aleatório entre min e max (inclusivo)
    public range(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    }
  }
  
  // Utilitário para gerar uma Seed aleatória padrão legível (ex: "JOGO-7482-A")
  export function generateRandomSeed(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `RUN-${result}`;
  }