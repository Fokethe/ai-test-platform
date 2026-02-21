import { useEffect, useCallback } from 'react';

export type HotkeyCallback = (event: KeyboardEvent) => void;

export interface HotkeyOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
}

export function useHotkey(
  key: string,
  callback: HotkeyCallback,
  options: HotkeyOptions = {}
) {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    preventDefault = true,
    stopPropagation = false,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = ctrl === event.ctrlKey;
      const shiftMatch = shift === event.shiftKey;
      const altMatch = alt === event.altKey;
      const metaMatch = meta === event.metaKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        callback(event);
      }
    },
    [key, callback, ctrl, shift, alt, meta, preventDefault, stopPropagation, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// 预定义的快捷键组合
export function useCommonHotkeys(handlers: {
  onSearch?: () => void;
  onCreate?: () => void;
  onSave?: () => void;
  onRefresh?: () => void;
  onClose?: () => void;
}) {
  useHotkey('k', handlers.onSearch || (() => {}), { ctrl: true });
  useHotkey('n', handlers.onCreate || (() => {}), { ctrl: true });
  useHotkey('s', handlers.onSave || (() => {}), { ctrl: true });
  useHotkey('r', handlers.onRefresh || (() => {}), { ctrl: true });
  useHotkey('Escape', handlers.onClose || (() => {}));
}

// 全局快捷键提示组件
export const HOTKEYS_HELP = [
  { keys: ['Ctrl', 'K'], description: '搜索' },
  { keys: ['Ctrl', 'N'], description: '新建' },
  { keys: ['Ctrl', 'S'], description: '保存' },
  { keys: ['Ctrl', 'R'], description: '刷新' },
  { keys: ['Esc'], description: '关闭/取消' },
];
