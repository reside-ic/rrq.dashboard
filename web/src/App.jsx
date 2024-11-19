import dayjs from 'dayjs'
import { Split } from '@gfazioli/mantine-split-pane';
import { TextInput, useCombobox, Combobox, ScrollArea } from '@mantine/core';
import { Group, AppShell, Autocomplete, Stack, Text, MantineProvider, Tabs } from '@mantine/core';
import { Container, Box } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from 'react';

import { workerColumns, taskColumns, workerConfigColumns } from './columns';
import useSWR from "swr";

import ApiTable from './ApiTable';
import fetcher from "./fetcher";

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
  const [inputValue, setInputValue] = useState(props.defaultValue);

  const { data } = useSWR("/controllers", fetcher);
  const combobox = useCombobox();
  const handleBlur = (event) => {
    props.onSubmit(inputValue);
    combobox.closeDropdown();
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      props.onSubmit(inputValue);
      combobox.closeDropdown();
    }
  };
  const handleSubmit = (value) => {
    props.onSubmit(value);
    setInputValue(value);
    combobox.closeDropdown();
  };

  const renderOption = (it) =>
    <Combobox.Option value={it.id} key={it.id}>
      <Text size="sm">{it.id}</Text>
      <Text size="xs" opacity={0.5}>Last used {dayjs(it.time).fromNow()}{it.username ? ` by ${it.username}` : ""}</Text>
    </Combobox.Option>;

  const controllers = data?.controllers ?? [];
  controllers.sort((a, b) => b.time.localeCompare(a.time))

  return <Combobox onOptionSubmit={handleSubmit} store={combobox} w={350}>
    <Combobox.Target>
      <TextInput
        label="Queue ID:"
        value={inputValue}
        onChange={(event) => setInputValue(event.currentTarget.value)}
        styles={(theme) => ({
          root: {
            display: "flex",
              align: "flex-start",
              alignItems: "center",
              gap: theme.spacing.md,
              marginTop: theme.spacing.md,
          },
          wrapper: {
            flex: 1,
          },
        })}
        onClick={() => combobox.openDropdown()}
        onFocus={() => combobox.openDropdown()}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </Combobox.Target>
    <Combobox.Dropdown>
      <Combobox.Options>
        {controllers.map(renderOption)}
      </Combobox.Options>
    </Combobox.Dropdown>
  </Combobox>;
}

function WorkerEvents(props) {
  const endpoint = `/controller/${props.queueId}/worker/${props.workerId}/events`;
  const { data, error, isLoading } = useSWR(endpoint, fetcher, {
    shouldRetryOnError: false
  });

  if (data != null) {
    const contents = data?.events.map((e) => `${e.time} ${e.message}\n`);
    return <span><pre>{contents.join("")}</pre></span>;
  } else {
    return <span>Loading...</span>;
  }
}

function WorkerTab(props) {
  const [workerId, setWorkerId] = useParam("workerId", "");

  useEffect(() => { setWorkerId(""); }, [props.queueId]);

  const rowSelection = {};
  if (workerId !== "") {
    rowSelection[workerId] = true;
  }

  const table = <ApiTable
    endpoint={props.queueId ? `/controller/${props.queueId}/workers` : null}
    accessorKey="workers"
    columns={workerColumns}
    initialState={{ sorting: [ { id: "start_time", desc: true }] }}
    state={{ rowSelection }}
    tableProps={{
      getRowId: (data) => data.id,
      enableRowSelection: false,
      enableMultiRowSelection: false,
      mantineTableBodyRowProps: ({ row }) => {
        const isSelected = row.original.id == workerId;
        return {
          onClick: (event) => setWorkerId(isSelected ? "" : row.original.id),
          style: {
            cursor: 'pointer',
            ...(isSelected && { backgroundColor: "var(--mantine-color-blue-2)" })
          },
        };
      },
      onRowSelectionChange: (updateSelection) => {
        const newSelection = updateSelection(rowSelection);
        setWorkerId(Object.keys(newSelection)[0] ?? "")
      },
    }}
  />;

  const showEvents = props.queueId && workerId;
  const children = [<Split.Pane grow={!showEvents} key="left">{table}</Split.Pane>];
  if (showEvents) {
    children.push(
      <Split.Pane key="right" grow={true}>
        <ScrollArea
          styles={{
            root: { height: "100%", width: "100%" },
            viewport: { height: "100%", width: "100%" },
          }} >
            <WorkerEvents queueId={props.queueId} workerId={workerId} />
        </ScrollArea>
      </Split.Pane>
    );
  }
  return (
    <Split h="100%">
      {children}
    </Split>
  );
}

function App() {
  const [activeTab, setActiveTab] = useParam("tab", "tasks");
  const [queueId, setQueueId] = useParam("queueId", "");

  return (
    <MantineProvider >
      <DatesProvider settings={{ locale: 'en-gb' }}>
        <AppShell padding="md" h="100%">
          <Stack h="100%">
            <Group px="sm">
              <QueueSelector defaultValue={queueId} onSubmit={setQueueId} />
            </Group>
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              styles={{
                root: {
                  flexGrow: 1, display: "flex", flexDirection: "column"
                },
                panel: {
                  flexGrow: 1,
                  height: 0
                }
              }}
            >
              <Tabs.List>
                <Tabs.Tab value="tasks">Tasks</Tabs.Tab>
                <Tabs.Tab value="workers">Workers</Tabs.Tab>
                <Tabs.Tab value="worker_config">Worker configuration</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="tasks" style={{ flexGrow: 1 }}>
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
