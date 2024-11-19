import { Box, Text } from '@mantine/core';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import useSWR from "swr";
import fetcher from "./fetcher";

export default function ApiTable(props) {
  const { data, error, isLoading } = useSWR(props.endpoint, fetcher, {
    shouldRetryOnError: false
  });

  const table = useMantineReactTable({
    columns: props.columns,
    initialState: {
      showColumnFilters: true,
      pagination: { pageSize: 50 },
      ...props.initialState
    },
    state: {
      isLoading,
      ...props.state
    },
    enableTopToolbar: false,
    enableColumnOrdering: false,
    enableHiding: false,

    data: data?.[props.accessorKey] ?? [],
    renderEmptyRowsFallback: ({ table }) => {
      if (error) {
        return (
          <Text
            style={{
              fontStyle: "italic",
              paddingBottom: "2rem",
              paddingTop: "2rem",
              textAlign: "center",
              color: "red",
            }}>{error.message}</Text>
        );
      }
    },

    ...props.tableProps,
    mantineFilterDateInputProps: {
      valueFormat: 'L',
      highlightToday: true,
      ...props.tableProps?.mantineFilterDateInputProps,
    },
    mantinePaperProps: {
      shadow: 'none',
      w: '100%',
      h: '100%',
      ...props.tableProps?.mantinePaperProps,
      style: {
        borderRadius: '0',
        border: '1px dashed #e0e0e0',
        display: "flex",
        flexDirection: "column",
        ...props.tableProps?.mantinePaperProps?.style,
      }
    },
    mantineTableProps: {
      striped: true,
      ...props.tableProps?.mantineTableProps,
    },
    mantinePaginationProps: {
      rowsPerPageOptions: ["50", "100", "500"],
      ...props.tableProps?.mantinePaginationProps,
    },
    mantineTableContainerProps: {
      ...props.tableProps?.mantineTableContainerProps,
      style: {
        flexGrow: 1,
        height: 0,
        ...props.tableProps?.mantineTableContainerProps?.style,
      }
    },
  });

  return <MantineReactTable table={table} />;
}
