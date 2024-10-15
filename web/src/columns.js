import dayjs from 'dayjs'
import { createColumnHelper } from "@tanstack/react-table";
import { useDatesContext } from '@mantine/dates';

function dateAccessorFn(key) {
  return (row) => new Date(row[key])
}
function LocalizedDate(props) {
  const { getLocale } = useDatesContext();
  return <span>{props.value.toLocaleString(getLocale())}</span>
}
function renderDateCell({ cell }) {
  return <LocalizedDate value={cell.getValue()} />
}
function filterDateTime(row, columnId, filterValue) {
  // TODO: this is timezone dependent. Currently uses the local one, should be
  // configurable?
  const value = row.getValue(columnId);
  if (filterValue instanceof Date) {
    return dayjs(filterValue).isSame(value, 'day')
  } else {
    const [startTime, endTime] = filterValue;
    return (startTime === undefined || dayjs(startTime).isSameOrBefore(value, 'day')) &&
      (endTime === undefined || dayjs(endTime).isSameOrAfter(value, 'day'));
  }
}

const columnHelper = createColumnHelper();

export const taskColumns = [
  columnHelper.accessor("id", {
    header: "ID",
    filterFn: "includesString",
    enableClickToCopy: true,
    enableSorting: false,
  }),
  columnHelper.accessor("queue", {
    header: "Queue",
    filterFn: "includesString",
  }),
  columnHelper.accessor("worker_id", {
    header: "Worker",
    filterFn: "includesString",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    filterVariant: 'multi-select',
    enableSorting: false,
    mantineFilterMultiSelectProps: {
      data: [
        "PENDING",
        "RUNNING",
        "COMPLETE",
        "ERROR",
        "CANCELLED",
        "DIED",
        "TIMEOUT",
        "MISSING",
        "MOVED",
        "DEFERRED",
        "IMPOSSIBLE"
      ]
    }
  }),
  columnHelper.accessor(dateAccessorFn("submit_time"), {
    header: "Submitted",
    Cell: renderDateCell,
    filterVariant: 'date',
    sortFn: "datetime",
    filterFn: filterDateTime,
  }),
  columnHelper.accessor(dateAccessorFn("start_time"), {
    id: "start_time",
    header: "Started",
    Cell: renderDateCell,
    filterVariant: 'date',
    sortFn: "datetime",
    filterFn: filterDateTime,
  }),
  columnHelper.accessor(dateAccessorFn("complete_time"), {
    id: "complete_time",
    header: "Completed",
    Cell: renderDateCell,
    filterVariant: 'date',
    sortFn: "datetime",
    filterFn: filterDateTime,
  }),
];

export const workerColumns = [
  columnHelper.accessor("id", {
    header: "ID",
    filterFn: "includesString",
    enableClickToCopy: true,
    enableSorting: false,
  }),
  columnHelper.accessor(dateAccessorFn("start_time"), {
    id: "start_time",
    header: "Started",
    Cell: renderDateCell,
    filterVariant: 'date',
    sortFn: "datetime",
    filterFn: filterDateTime,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    filterVariant: 'multi-select',
    enableSorting: false,
    mantineFilterMultiSelectProps: {
      data: [
        "IDLE",
        "BUSY",
        "EXITED",
        "LOST",
        "PAUSED"
      ]
    }
  }),
  columnHelper.accessor("hostname", {
    header: "Hostname",
    enableClickToCopy: true,
  }),
];
