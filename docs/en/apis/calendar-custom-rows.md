# Custom Rows in Weekly/Day Views

This document explains the design and implementation of the custom-rows feature added to TOAST UI Calendar. Custom rows allow integrators to inject arbitrary content as additional, non-draggable grid rows above or below the time-of-day area in weekly/day views.

## Goals

- Provide a generic, opt-in API to declare extra grid rows per week/day view.
- Each row has:
  - A left title area (styled like existing panels) rendered via the template system.
  - One cell per day that can contain any custom DOM content (including interactive controls).
- No coupling to event layout, DnD, or timezone logic.
- Preserve existing resize behavior and layout store for panel heights.

## Public API

Exposed via the weekly options (`Options.week.customRows`).

```ts
interface CustomRowCellRenderArgs {
  date: TZDate;
  index: number;
  container: HTMLElement;
}

export type CustomRowPosition = 'top' | 'bottom';

interface CustomRow {
  name: string;                 // unique id used for panel state
  position?: CustomRowPosition; // default 'top'
  title?: string;               // left header text
  renderCell?: (args: CustomRowCellRenderArgs) => void; // imperative cell renderer
}
```

Usage example:

```js
const calendar = new Calendar('#container', {
  defaultView: 'week',
  week: {
    customRows: [
      {
        name: 'preferences',
        title: 'Preferences',
        position: 'top',
        renderCell: ({ date, container }) => {
          container.textContent = date.toDate().toDateString();
        },
      },
    ],
  },
});
```

### Template integration

A generic template key `customRowTitle(label: string)` was added to the template interface and default template. The left title area of custom rows uses this template with the provided `title` (or `name` when `title` is omitted).

Developers can override the appearance by providing their own `customRowTitle` implementation through `setOptions({ template: { customRowTitle() { ... } } })`.

## Implementation Details

### Files added

- `apps/calendar/src/components/dayGridWeek/customGridCell.tsx`
  - Renders a single grid cell styled like week day-grid cells (`panel-grid` class, width/left based on day index).
  - Accepts an imperative `renderCell` to inject arbitrary DOM into the cell's container.

- `apps/calendar/src/components/dayGridWeek/customGridRow.tsx`
  - Renders a custom row panel:
    - Left title using `template: customRowTitle`.
    - A `panel-grid-wrapper` with one `CustomGridCell` per day.
  - Reuses theme selectors/styling from week day-grid left area.
  - Height is controlled like other panels via the `Panel` component and the week layout slice.

### Existing components reused

- `apps/calendar/src/components/panel.tsx` and `apps/calendar/src/components/panelResizer.tsx`
  - Panels handle layout and optional resizing. Custom rows are wrapped in a `Panel` with the row name as key so their heights are tracked in `weekViewLayout`.

- `apps/calendar/src/components/view/week.tsx`
  - Reads `week.customRows` from options.
  - Renders two lists: top and bottom rows around the time grid.
  - Passes week dates, narrowWeekend, and the row's `renderCell` to `CustomGridRow`.

### Store and options changes

- `apps/calendar/src/types/options.ts`
  - Added `customRows?: CustomRow[]` to `WeekOptions`.
  - Added the public types for `CustomRow`, `CustomRowPosition`, and `CustomRowCellRenderArgs`.

- `apps/calendar/src/slices/options.ts`
  - Ensures `customRows` defaults to an empty array in the internal `CalendarWeekOptions` (`initializeWeekOptions`) so state is always well-defined.

- `apps/calendar/src/types/store.ts`
  - Internal `CalendarWeekOptions` marks `customRows` as required to avoid optional checks within the view.

### Template additions

- `apps/calendar/src/types/template.ts`
  - Added `customRowTitle: (label: string) => TemplateReturnType`.

- `apps/calendar/src/template/default.tsx`
  - Implemented a default `customRowTitle` that matches other left header titles.

### Why a new row component?

Reusing `OtherGridRow` or `AlldayGridRow` would introduce event model coupling and selection behaviors that custom rows do not need. A small, purpose-built `CustomGridRow` keeps responsibilities clear and avoids event/layout side effects.

### Styling

- Custom rows use the same CSS class structure as other day-grid panels:
  - Wrapper uses `panel` and row name class.
  - Title uses `panel-title` and the `week.dayGridLeft` theme area.
  - Cells use `panel-grid` within `panel-grid-wrapper`.

### Interaction policy

- Cells are not drag sources or drop targets.
- Clicking in cells has no built-in behavior; implementers can add behavior inside `renderCell` (e.g., attach event listeners to injected controls).

### Timezone/DnD isolation

- The custom-row implementation does not touch timezone selection, calculation, or rendering code.
- No references to event matrices, DnD helpers, or grid selection are included in custom rows.

## Testing Guidance

- Unit tests for custom rows can verify:
  - The number of custom panels rendered matches the `customRows` array.
  - The left title area contains the expected text (or custom template output).
  - `renderCell` is invoked for each day (can be observed by injecting a data attribute).

- In the React example app, demonstrate custom rows by passing `week.customRows` and injecting simple controls or text per day.

## Maintenance Notes

- Keep the custom-row code path generic; avoid adding behavior that couples it to events or timezone logic.
- When changing layout or theme structure of weekly/day views, ensure `panel-title` and `panel-grid-wrapper` remain compatible with `CustomGridRow`.
- If future requirements need dynamic row addition/removal at runtime, prefer using `setOptions({ week: { customRows } })` rather than mutating internal state directly.
