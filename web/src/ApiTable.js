import { Box, Text, createStyles } from '@mantine/core';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import useSWR from "swr";
import fetcher from "./fetcher";

const useStyles = createStyles((theme) => ({
  // https://github.com/mantinedev/mantine/commit/67e66d7eab151ee6e17e20ae39627033d8da9413
  highlightToday: {
    '&[data-today]:not([data-selected], [data-in-range])': {
      border: '1px solid',
      borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[4],
    }
  },

  tableEmpty: {
    fontStyle: "italic",
    maxWidth: "100vw",
    paddingBottom: "2rem",
    paddingTop: "2rem",
    textAlign: "center",
    width: "100%",
  },
}))

export default function ApiTable(props) {
  const { data, error, isLoading } = useSWR(props.endpoint, fetcher, {
    shouldRetryOnError: false
  });

  const { classes } = useStyles();
  const table = useMantineReactTable({
    columns: props.columns,
    initialState: {
      showColumnFilters: true,
    },
    state: { isLoading },
    enableTopToolbar: false,
    enableColumnOrdering: false,
    enableHiding: false,
    mantineFilterDateInputProps: {
      valueFormat: 'L',
      classNames: {
        day: classes.highlightToday
      },
    },
    mantinePaperProps: {
      shadow: 'none',
      sx: {
        borderRadius: '0',
        border: '1px dashed #e0e0e0',
      },
    },
    mantineTableProps: {
      striped: true,
    },
    data: data?.[props.accessorKey] ?? [],
    renderEmptyRowsFallback: ({ table }) => {
      if (error) {
        return (<Box className={classes.tableEmpty}><Text color="red">{error.message}</Text></Box>);
      }
    },
  });

  return <MantineReactTable table={table} />;
}
