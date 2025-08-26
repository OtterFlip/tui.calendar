import { h } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import { useTheme } from '@src/contexts/themeStore';
import { cls } from '@src/helpers/css';
import type TZDate from '@src/time/date';

interface Props {
  width: string;
  left: string;
  date: TZDate;
  index: number;
  /** Called after the cell DOM is mounted to allow imperative rendering */
  renderCell?: (args: { date: TZDate; index: number; container: HTMLElement }) => void;
}

export function CustomGridCell({ width, left, date, index, renderCell }: Props) {
  const { borderRight, backgroundColor } = useTheme(useCallback((theme) => theme.week.dayGrid, []));
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current && renderCell) {
      renderCell({ date, index, container: containerRef.current });
    }
  }, [date, index, renderCell]);

  return (
    <div
      className={cls('panel-grid')}
      style={{ width, left, borderRight, backgroundColor }}
      ref={containerRef}
    />
  );
}
