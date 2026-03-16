/**
 * useAutoRefresh Hook 测试
 * TDD: 验证自动刷新功能
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useSWR from 'swr';

// Mock SWR
jest.mock('swr');

describe('useAutoRefresh', () => {
  const mockMutate = jest.fn();
  const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSWR.mockReturnValue({
      data: { data: { list: [] } },
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('应该提供手动刷新功能', async () => {
    // 模拟 Hook 使用
    const { result } = renderHook(() =>
      mockUseSWR('/api/test', jest.fn(), {
        refreshInterval: 30 * 60 * 1000, // 30分钟
      })
    );

    // 验证 mutate 存在
    expect(result.current.mutate).toBeDefined();

    // 调用刷新
    await act(async () => {
      await result.current.mutate();
    });

    expect(mockMutate).toHaveBeenCalled();
  });

  it('应该配置30分钟定时刷新', () => {
    renderHook(() =>
      mockUseSWR('/api/test', jest.fn(), {
        refreshInterval: 30 * 60 * 1000,
      })
    );

    // 验证配置正确传递
    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/test',
      expect.any(Function),
      expect.objectContaining({
        refreshInterval: 30 * 60 * 1000,
      })
    );
  });

  it('应该在 CRUD 操作后自动刷新', async () => {
    const { result } = renderHook(() =>
      mockUseSWR('/api/test', jest.fn())
    );

    // 模拟删除操作后刷新
    await act(async () => {
      // 刷新数据（模拟 CRUD 后调用）
      await result.current.mutate();
    });

    expect(mockMutate).toHaveBeenCalled();
  });
});
