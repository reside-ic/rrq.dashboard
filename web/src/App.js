import dayjs from 'dayjs'
import { Group, AppShell, Autocomplete, Stack, Text, MantineProvider, Tabs } from '@mantine/core';
import { Container } from '@mantine/core';
import { createStyles, getSize } from '@mantine/styles';
import { DatesProvider } from '@mantine/dates';
import { useSearchParams } from "react-router-dom";
import { forwardRef } from 'react';

import { workerColumns, taskColumns, workerConfigColumns } from './columns';
import useSWR from "swr";

import ApiTable from './ApiTable';
import fetcher from "./fetcher";

const useStyles = createStyles((theme) => ({
    horizontalFlexBox: {
      display: "flex",
      align: "flex-start",
      alignItems: "center",
      gap: getSize({ size: "md", sizes: theme.spacing }),
    },
    inputWrapper: {
      flex: 1,
    },
}))

function useParam(name, defaultValue) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(name) ?? defaultValue;
  const setValue = function(newValue) {
    setSearchParams(params => {
      params.set(name, newValue);
      return params;
    });
  };
  return [value, setValue];
}

function QueueSelector(props) {
  const { data } = useSWR("/controllers", fetcher);
  const { classes } = useStyles();
  const handleBlur = (event) => {
    props.onSubmit(event.currentTarget.value);
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      props.onSubmit(event.currentTarget.value);
    }
  };
  const handleItemSubmit = (event) => {
    props.onSubmit(event.value);
  };

  const renderOption = forwardRef(({ id, time, username, ...others }, ref) => {
    return <div ref={ref} {...others}>
      <Text size="sm">{id}</Text>
      <Text size="xs" opacity={0.5}>Last used {dayjs(time).fromNow()} by {username}</Text>
    </div>;
  });

  const controllers = data?.controllers ?? [];
  controllers.sort((a, b) => b.time.localeCompare(a.time))

  return (
    <Autocomplete
      label="Queue ID:"
      data={controllers.map((it) => ({ ...it, value: it.id }))}
      filter={(value, item) => true}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onItemSubmit={handleItemSubmit}
      defaultValue={props.defaultValue}
      itemComponent={renderOption}
      limit={10}
      classNames={{
        root: classes.horizontalFlexBox,
        wrapper: classes.inputWrapper,
      }}
      w={500}
      maxDropdownHeight={400}
    />
  )
}

function WorkerEvents(props) {
  const endpoint = `/controller/${props.queueId}/worker/${props.workerId}/events`;
  const { data, error, isLoading } = useSWR(endpoint, fetcher, {
    shouldRetryOnError: false
  });

  if (data != null) {
    const contents = data?.events.map((e) => `${e.time} ${e.message}\n`);
    console.log(contents);
    return <span><pre>{contents.join("")}</pre></span>;
  } else {
    return <span>Loading...</span>;
  }
}

function WorkerTab(props) {
  const [workerId, setWorkerId] = useParam("workerId", "");
  const table = <ApiTable
    endpoint={props.queueId ? `/controller/${props.queueId}/workers` : null}
    accessorKey="workers"
    columns={workerColumns}
    initialState={{ sorting: [ { id: "start_time", desc: true }] }}
    tableProps={{
      renderDetailPanel: ({ row, table }) => <WorkerEvents queueId={props.queueId} workerId={row.original.id} />,
      mantineTableBodyRowProps: ({ row }) => ({
        onClick: (event) => setWorkerId(row.original.id),
        style: {
          cursor: 'pointer',
        },
      }),
    }}
  />;

  if (workerId !== "") {
    return <Group style={{alignItems: 'flex-start'}}>
      {table}
      <WorkerEvents queueId={props.queueId} workerId={workerId} />
    </Group>;
  } else {
    return table;
  }
}

function App() {
  const [activeTab, setActiveTab] = useParam("tab", "tasks");
  const [queueId, setQueueId] = useParam("queueId", "");

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <DatesProvider settings={{ locale: 'en-gb' }}>
        <AppShell padding="md">
          <Stack>
            <Group px="sm">
              <QueueSelector defaultValue={queueId} onSubmit={setQueueId} />
            </Group>
            <Tabs value={activeTab} onTabChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
                <Tabs.Tab value="workers">Workers</Tabs.Tab>
                <Tabs.Tab value="worker_config">Worker configuration</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="tasks">
                <ApiTable
                  endpoint={queueId ? `/controller/${queueId}/tasks` : null}
                  accessorKey="tasks"
                  columns={taskColumns}
                  initialState={{ sorting: [ { id: "start_time", desc: true }] }}
                />
              </Tabs.Panel>
              <Tabs.Panel value="workers">
                <WorkerTab queueId={queueId} />
              </Tabs.Panel>
              <Tabs.Panel value="worker_config">
                <ApiTable
                  endpoint={queueId ? `/controller/${queueId}/worker_config` : null}
                  accessorKey="worker_config"
                  columns={workerConfigColumns}
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </AppShell>
      </DatesProvider>
    </MantineProvider>
  );
}

export default App;
