import { Fragment, h } from 'preact';
import { useMemo } from 'preact/hooks';

import { CustomGridCell } from '@src/components/dayGridWeek/customGridCell';
import { Template } from '@src/components/template';
import { DEFAULT_PANEL_HEIGHT } from '@src/constants/style';
import { useTheme } from '@src/contexts/themeStore';
import { cls, toPercent } from '@src/helpers/css';
import { getGridWidthAndLeftPercentValues, TOTAL_WIDTH } from '@src/helpers/grid';
import { weekDayGridLeftSelector } from '@src/selectors/theme';
import type TZDate from '@src/time/date';

interface Props {
  name: string;
  title?: string;
  titleTemplate?: string;
  height?: number;
  weekDates: TZDate[];
  narrowWeekend?: boolean;
  /** optional render hook per cell for arbitrary content */
  renderCell?: (args: { date: TZDate; index: number; container: HTMLElement }) => void;
}

export function CustomGridRow({
  name,
  title,
  titleTemplate,
  height = DEFAULT_PANEL_HEIGHT,
  weekDates,
  narrowWeekend = false,
  renderCell,
}: Props) {
  const dayGridLeftTheme = useTheme(weekDayGridLeftSelector);
  const { widthList, leftList } = useMemo(
    () => getGridWidthAndLeftPercentValues(weekDates, narrowWeekend, TOTAL_WIDTH),
    [weekDates, narrowWeekend]
  );

  return (
    <Fragment>
      <div className={cls('panel-title')} style={dayGridLeftTheme}>
        {titleTemplate ? (
          <Template template={titleTemplate as any} param={title ?? name} />
        ) : (
          <Template template={'customRowTitle' as any} param={title ?? name} />
        )}
      </div>
      <div className={cls('allday-panel')} style={{ height }}>
        <div className={cls('panel-grid-wrapper')}>
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
