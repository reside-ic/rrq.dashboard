import dayjs from 'dayjs'
import { Tooltip } from '@mantine/core';
import { createColumnHelper } from "@tanstack/react-table";
import { useDatesContext } from '@mantine/dates';

function dateAccessorFn(key) {
  return (row) => {
    if (row[key] == null) {
      return null;
    } else {
      return new Date(row[key]);
    }
  };
}
function LocalizedDate(props) {
  const { getLocale } = useDatesContext();
  if (props.value == null) {
    return "";
  } else {
    return (<Tooltip label={dayjs(props.value).fromNow()}>
      <span>{props.value.toLocaleString(getLocale())}</span>
    </Tooltip>);
  };
}
function renderDateCell({ cell }) {
  return <LocalizedDate value={cell.getValue()} />
}
function filterDateTime(row, columnId, filterValue) {
  // TODO: this is timezone dependent. Currently uses the local one, should be
  // configurable?
  const value = row.getValue(columnId);
  if (value == null) {
    return false;
  } else if (filterValue instanceof Date) {
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
  columnHelper.accessor("worker_id", {
    header: "Worker",
    filterFn: "includesString",
    enableClickToCopy: true,
    enableSorting: false,
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


export const workerConfigColumns = [
  columnHelper.accessor("name", {
    header: "Name",
    filterFn: "includesString",
    enableClickToCopy: true,
    enableSorting: false,
  }),
  columnHelper.accessor("timeout_idle", {
    header: "Idle timeout",
    enableSorting: false,
    enableColumnFilter: false,
  }),
  columnHelper.accessor("heartbeat_period", {
    header: "Heartbeat period",
    enableSorting: false,
    enableColumnFilter: false,
  }),
  columnHelper.accessor("poll_queue", {
    header: "Polling interval",
    enableSorting: false,
    enableColumnFilter: false,
  }),
  columnHelper.accessor("offload_threshold_size", {
    header: "Offload threshold",
    enableSorting: false,
    enableColumnFilter: false,
  }),
]
