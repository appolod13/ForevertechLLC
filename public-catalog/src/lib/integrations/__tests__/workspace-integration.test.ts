
import { describe, it, expect } from 'vitest';
import { SocialMediaAgent, sum } from 'project-workspace';

describe('Project Workspace Integration', () => {
  it('should correctly import and use sum function', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('should correctly use SocialMediaAgent', async () => {
    const agent = new SocialMediaAgent({
      apiKey: 'test-key',
      platform: 'twitter'
    });

    const content = await agent.generateContent('AI Technology');
    expect(content).toBe('Generated content for twitter about AI Technology');

    const posted = await agent.postContent(content);
    expect(posted).toBe(true);
  });
});
