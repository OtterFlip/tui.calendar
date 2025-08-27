import { h } from 'preact';
import { useCallback, useLayoutEffect, useMemo } from 'preact/hooks';

import { GridHeader } from '@src/components/dayGridCommon/gridHeader';
import { AlldayGridRow } from '@src/components/dayGridWeek/alldayGridRow';
import { CustomGridRow } from '@src/components/dayGridWeek/customGridRow';
import { OtherGridRow } from '@src/components/dayGridWeek/otherGridRow';
import { Layout } from '@src/components/layout';
import { Panel } from '@src/components/panel';
import { TimeGrid } from '@src/components/timeGrid/timeGrid';
import { TimezoneLabels } from '@src/components/timeGrid/timezoneLabels';
import {
  DEFAULT_PANEL_HEIGHT,
  WEEK_DAY_NAME_BORDER,
  WEEK_DAY_NAME_HEIGHT,
} from '@src/constants/style';
import { useDispatch, useStore } from '@src/contexts/calendarStore';
import { useTheme } from '@src/contexts/themeStore';
import { cls } from '@src/helpers/css';
import { getDayNames } from '@src/helpers/dayName';
import { createTimeGridData, getWeekDates, getWeekViewEvents } from '@src/helpers/grid';
import { getActivePanels } from '@src/helpers/view';
import { useCalendarData } from '@src/hooks/calendar/useCalendarData';
import { useDOMNode } from '@src/hooks/common/useDOMNode';
import { useTimeGridScrollSync } from '@src/hooks/timeGrid/useTimeGridScrollSync';
import { useTimezoneLabelsTop } from '@src/hooks/timeGrid/useTimezoneLabelsTop';
import {
  calendarSelector,
  optionsSelector,
  viewSelector,
  weekViewLayoutSelector,
} from '@src/selectors';
import { primaryTimezoneSelector } from '@src/selectors/timezone';
import { addDate, getRowStyleInfo, toEndOfDay, toStartOfDay } from '@src/time/datetime';
import { first, last } from '@src/utils/array';

import type { WeekOptions } from '@t/options';

function useWeekViewState() {
  const options = useStore(optionsSelector);
  const calendar = useStore(calendarSelector);
  const { dayGridRows: gridRowLayout, lastPanelType } = useStore(weekViewLayoutSelector);
  const { renderDate } = useStore(viewSelector);

  return useMemo(
    () => ({
      options,
      calendar,
      gridRowLayout,
      lastPanelType,
      renderDate,
    }),
    [calendar, gridRowLayout, lastPanelType, options, renderDate]
  );
}

export function Week() {
  const { options, calendar, gridRowLayout, lastPanelType, renderDate } = useWeekViewState();
  const gridHeaderMarginLeft = useTheme(useCallback((theme) => theme.week.dayGridLeft.width, []));

  const primaryTimezoneName = useStore(primaryTimezoneSelector);

  const [timePanel, setTimePanelRef] = useDOMNode<HTMLDivElement>();

  const weekOptions = options.week as Required<WeekOptions>;
  const {
    narrowWeekend,
    startDayOfWeek,
    workweek,
    hourStart,
    hourEnd,
    eventView,
    taskView,
    customRows = [],
  } = weekOptions;
  const weekDates = useMemo(() => getWeekDates(renderDate, weekOptions), [renderDate, weekOptions]);
  const dayNames = getDayNames(weekDates, options.week?.dayNames ?? []);
  const { rowStyleInfo, cellWidthMap } = getRowStyleInfo(
    weekDates.length,
    narrowWeekend,
    startDayOfWeek,
    workweek
  );
  const calendarData = useCalendarData(calendar, options.eventFilter);
  const eventByPanel = useMemo(() => {
    const getFilterRange = () => {
      if (primaryTimezoneName === 'Local') {
        return [toStartOfDay(first(weekDates)), toEndOfDay(last(weekDates))];
      }

      // NOTE: Extend filter range because of timezone offset differences
      return [toStartOfDay(addDate(first(weekDates), -1)), toEndOfDay(addDate(last(weekDates), 1))];
    };

    const [weekStartDate, weekEndDate] = getFilterRange();

    return getWeekViewEvents(weekDates, calendarData, {
      narrowWeekend,
      hourStart,
      hourEnd,
      weekStartDate,
      weekEndDate,
    });
  }, [calendarData, hourEnd, hourStart, narrowWeekend, primaryTimezoneName, weekDates]);
  const timeGridData = useMemo(
    () =>
      createTimeGridData(weekDates, {
        hourStart,
        hourEnd,
        narrowWeekend,
      }),
    [hourEnd, hourStart, narrowWeekend, weekDates]
  );

  const activePanels = getActivePanels(taskView, eventView);
  const dayGridRows = activePanels.map((key) => {
    if (key === 'time') {
      return null;
    }

    const rowType = key as 'milestone' | 'task' | 'allday';

    return (
      <Panel name={rowType} key={rowType} resizable={rowType !== lastPanelType}>
        {rowType === 'allday' ? (
          <AlldayGridRow
            events={eventByPanel[rowType as 'allday']}
            rowStyleInfo={rowStyleInfo}
            gridColWidthMap={cellWidthMap}
            weekDates={weekDates}
            height={gridRowLayout[rowType]?.height}
            options={weekOptions}
          />
        ) : (
          <OtherGridRow
            category={rowType as 'milestone' | 'task'}
            events={eventByPanel[rowType as 'milestone' | 'task']}
            weekDates={weekDates}
            height={gridRowLayout[rowType]?.height}
            options={weekOptions}
            gridColWidthMap={cellWidthMap}
          />
        )}
      </Panel>
    );
  });
  const customTopRows = customRows
    .filter((r) => r.position !== 'bottom')
    .map((row) => (
      <Panel name={row.name} key={`custom-${row.name}`} resizable={true}>
        <CustomGridRow
          name={row.name}
          title={row.title ?? row.name}
          titleTemplate={(row as any).titleTemplate}
          height={gridRowLayout[row.name]?.height}
          weekDates={weekDates}
          narrowWeekend={narrowWeekend}
          renderCell={row.renderCell}
        />
      </Panel>
    ));
  const customBottomRows = customRows
    .filter((r) => r.position === 'bottom')
    .map((row) => (
      <Panel name={row.name} key={`custom-${row.name}`} resizable={true}>
        <CustomGridRow
          name={row.name}
          title={row.title ?? row.name}
          titleTemplate={(row as any).titleTemplate}
          height={gridRowLayout[row.name]?.height}
          weekDates={weekDates}
          narrowWeekend={narrowWeekend}
          renderCell={row.renderCell}
          withTopBorder={true}
        />
      </Panel>
    ));
  const hasTimePanel = useMemo(() => activePanels.includes('time'), [activePanels]);

  useTimeGridScrollSync(timePanel, timeGridData.rows.length);

  const stickyTop = useTimezoneLabelsTop(timePanel);

  // Ensure the time panel takes the remaining height instead of any custom bottom rows
  const { setLastPanelType, updateDayGridRowHeight } = useDispatch('weekViewLayout');
  useLayoutEffect(() => {
    if (hasTimePanel) {
      if (!gridRowLayout?.time) {
        updateDayGridRowHeight({ rowName: 'time', height: DEFAULT_PANEL_HEIGHT });
      }
      setLastPanelType('time');
    }
  }, [hasTimePanel, gridRowLayout?.time, setLastPanelType, updateDayGridRowHeight]);

  return (
    <Layout className={cls('week-view')} autoAdjustPanels={true}>
      <Panel
        name="week-view-day-names"
        initialHeight={WEEK_DAY_NAME_HEIGHT + WEEK_DAY_NAME_BORDER * 2}
      >
        <GridHeader
          type="week"
          dayNames={dayNames}
          marginLeft={gridHeaderMarginLeft}
          options={weekOptions}
          rowStyleInfo={rowStyleInfo}
        />
      </Panel>
      {customTopRows}
      {dayGridRows}
      {hasTimePanel ? (
        <Panel name="time" autoSize={1} ref={setTimePanelRef}>
          <TimeGrid events={eventByPanel.time} timeGridData={timeGridData} />
          <TimezoneLabels top={stickyTop} />
        </Panel>
      ) : null}
      {customBottomRows}
    </Layout>
  );
}
