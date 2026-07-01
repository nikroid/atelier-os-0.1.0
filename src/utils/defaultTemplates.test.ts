import { describe, expect, it } from 'vitest';
import { getBuiltinTemplate } from './defaultTemplates';

describe('builtin catalogue', () => {
  it('has two pages (cover static + work dynamic)', () => {
    const tpl = getBuiltinTemplate('builtin_catalogue');
    expect(tpl).toBeDefined();
    expect(tpl?.nom).toBe('Catalogue Cilas');
    expect(tpl?.pages).toHaveLength(2);
    expect(tpl?.pages?.[0].kind).toBe('static');
    expect(tpl?.pages?.[0].root?.children?.length).toBeGreaterThanOrEqual(1);
    expect(tpl?.pages?.[1].kind).toBe('dynamic');
    expect(tpl?.widthMm).toBe(210);
    expect(tpl?.heightMm).toBe(297);
  });
});
