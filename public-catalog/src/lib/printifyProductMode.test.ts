import { describe, expect, it } from 'vitest';

import { buildAopPlacementPlan, expandAopPlacementKeys, resolveTemplateProductIdForItem } from './printifyProductMode';

describe('printify product mode helpers', () => {
  it('prefers explicit template ids and falls back to the AOP template for all-over-print items', () => {
    expect(
      resolveTemplateProductIdForItem(
        { templateProductId: 'prod_explicit', printType: 'all_over_print' },
        { defaultTemplateProductId: 'prod_standard', aopTemplateProductId: 'prod_aop' },
      ),
    ).toBe('prod_explicit');

    expect(
      resolveTemplateProductIdForItem(
        { printType: 'all_over_print' },
        { defaultTemplateProductId: 'prod_standard', aopTemplateProductId: 'prod_aop' },
      ),
    ).toBe('prod_aop');

    expect(
      resolveTemplateProductIdForItem(
        { printType: 'standard' },
        { defaultTemplateProductId: 'prod_standard', aopTemplateProductId: 'prod_aop' },
      ),
    ).toBe('prod_standard');
  });

  it('selects wrap-friendly AOP placement keys and filters out non-art placements', () => {
    expect(
      expandAopPlacementKeys(['front', 'back', 'left_sleeve', 'right_sleeve', 'neck', 'inside_label']),
    ).toEqual(['front', 'back', 'left_sleeve', 'right_sleeve']);

    expect(expandAopPlacementKeys(['back', 'neck'])).toEqual(['back']);
  });

  it('builds a placement plan for body, inside-tag, and collar zones', () => {
    expect(
      buildAopPlacementPlan(['front', 'back', 'left_sleeve', 'right_sleeve', 'inside_label', 'collar']),
    ).toEqual({
      body: {
        front: 'front',
        back: 'back',
        left_sleeve: 'left_sleeve',
        right_sleeve: 'right_sleeve',
      },
      branding: {
        inside_neck_tag: 'inside_label',
        collar: 'collar',
      },
      unsupported: [],
    });
  });
});
