
export function sum(a: number, b: number) {
  return a + b;
}

export interface SocialMediaConfig {
  apiKey: string;
  platform: 'twitter' | 'linkedin' | 'instagram';
}

export class SocialMediaAgent {
  constructor(private config: SocialMediaConfig) {}

  async generateContent(topic: string): Promise<string> {
    return `Generated content for ${this.config.platform} about ${topic}`;
  }

  async postContent(content: string): Promise<boolean> {
    console.log(`Posting to ${this.config.platform}: ${content}`);
    return true;
  }
}
