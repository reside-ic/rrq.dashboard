import { Group, AppShell, Autocomplete, Stack } from '@mantine/core';
import { MantineProvider, Tabs } from '@mantine/core';
import { createStyles, getSize } from '@mantine/styles';
import { DatesProvider } from '@mantine/dates';
import { useSearchParams } from "react-router-dom";

import { workerColumns, taskColumns } from './columns';
import useSWR from "swr";

import ApiTable from './ApiTable';
import fetcher from "./fetcher";

const useStyles = createStyles((theme) => ({
    horizontalFlexBox: {
      display: "flex",
      align: "flex-start",
      alignItems: "center",
      gap: getSize({ size: "md", sizes: theme.spacing }),
    }
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
  return (
    <Autocomplete
      label="Queue ID:"
      defaultValue={ props.defaultValue }
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onItemSubmit={handleItemSubmit}
      data={data?.controllers?.map((c) => c.id) ?? []}
      classNames={{
        root: classes.horizontalFlexBox
      }}
    />
  )
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
                <ApiTable
                  endpoint={queueId ? `/controller/${queueId}/workers` : null}
                  accessorKey="workers"
                  columns={workerColumns}
                  initialState={{ sorting: [ { id: "start_time", desc: true }] }}
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
