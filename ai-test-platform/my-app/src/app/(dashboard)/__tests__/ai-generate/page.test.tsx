import { render, screen } from '@testing-library/react';
import AIGeneratePage from '../../ai-generate/page';

describe('AIGeneratePage', () => {
  it('renders the simplified AI generate landing page', () => {
    render(<AIGeneratePage />);

    expect(screen.getByRole('heading', { name: 'AI 智能生成' })).toBeInTheDocument();
    expect(screen.getByText('需求生成')).toBeInTheDocument();
    expect(screen.getByText('用例生成')).toBeInTheDocument();
    expect(screen.getByText('最近生成')).toBeInTheDocument();
    expect(screen.getByText('使用提示')).toBeInTheDocument();
  });

  it('keeps direct links for the flattened flow', () => {
    render(<AIGeneratePage />);

    expect(screen.getByRole('link', { name: /直接去用例生成/i })).toHaveAttribute(
      'href',
      '/ai-generate/testcases'
    );
    expect(screen.getByRole('link', { name: /上传新需求/i })).toHaveAttribute(
      'href',
      '/ai-generate/requirements/upload'
    );
    expect(screen.getByRole('link', { name: /在测试中心打开/i })).toHaveAttribute(
      'href',
      '/tests?tab=ai'
    );
  });

  it('explains that testcase generation no longer requires the requirement detail hop', () => {
    render(<AIGeneratePage />);

    expect(
      screen.getByText('现在可以直接在生成页里选择需求和测试点，不用先绕去详情页再回来。')
    ).toBeInTheDocument();
    expect(
      screen.getByText('用例生成已经支持直接选需求和多测试点，一般不需要再绕去详情页。')
    ).toBeInTheDocument();
  });
});
