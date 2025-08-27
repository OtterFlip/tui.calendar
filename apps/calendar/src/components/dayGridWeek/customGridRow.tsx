import { Fragment, h } from 'preact';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';

import { CustomGridCell } from '@src/components/dayGridWeek/customGridCell';
import { Template } from '@src/components/template';
import { DEFAULT_PANEL_HEIGHT } from '@src/constants/style';
import { useDispatch } from '@src/contexts/calendarStore';
import { useTheme } from '@src/contexts/themeStore';
import { cls, toPercent } from '@src/helpers/css';
import { getGridWidthAndLeftPercentValues, TOTAL_WIDTH } from '@src/helpers/grid';
import { weekDayGridLeftSelector } from '@src/selectors/theme';
import type TZDate from '@src/time/date';

import type { ThemeState } from '@t/theme';

interface Props {
  name: string;
  title?: string;
  titleTemplate?: string;
  height?: number;
  weekDates: TZDate[];
  narrowWeekend?: boolean;
  /** optional render hook per cell for arbitrary content */
  renderCell?: (args: { date: TZDate; index: number; container: HTMLElement }) => void;
  withTopBorder?: boolean;
}

export function CustomGridRow({
  name,
  title,
  titleTemplate,
  height = DEFAULT_PANEL_HEIGHT,
  weekDates,
  narrowWeekend = false,
  renderCell,
  withTopBorder = false,
}: Props) {
  const dayGridLeftTheme = useTheme(weekDayGridLeftSelector);
  const panelBorder = useTheme(
    useMemo(() => (theme: ThemeState) => theme.week.panelResizer.border, [])
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { updateDayGridRowHeight } = useDispatch('weekViewLayout');
  const { widthList, leftList } = useMemo(
    () => getGridWidthAndLeftPercentValues(weekDates, narrowWeekend, TOTAL_WIDTH),
    [weekDates, narrowWeekend]
  );

  // Measure content height and keep panel compact but tall enough for its content
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const containers = Array.from(
      wrapperRef.current.querySelectorAll(`.${cls('panel-grid')}>div`)
    ) as HTMLElement[];
    const maxHeight = containers.reduce((max, el) => Math.max(max, el.offsetHeight), 0);
    const desired = Math.max(height, maxHeight + 8);
    updateDayGridRowHeight({ rowName: name, height: desired });
  }, [name, height, updateDayGridRowHeight, weekDates.length]);

  return (
    <Fragment>
      <div className={cls('panel-title')} style={dayGridLeftTheme}>
        {titleTemplate ? (
          <Template template={titleTemplate as any} param={title ?? name} />
        ) : (
          <Template template={'customRowTitle' as any} param={title ?? name} />
        )}
      </div>
      <div
        className={cls('allday-panel')}
        style={{ height: '100%', borderTop: withTopBorder ? (panelBorder as string) : null }}
      >
        <div className={cls('panel-grid-wrapper')} ref={wrapperRef}>
          {weekDates.map((date, index) => (
            <CustomGridCell
              key={`custom-grid-${name}-${date.getDate()}`}
              width={toPercent(widthList[index])}
              left={toPercent(leftList[index])}
              date={date}
              index={index}
              renderCell={renderCell}
            />
          ))}
        </div>
      </div>
    </Fragment>
  );
}
