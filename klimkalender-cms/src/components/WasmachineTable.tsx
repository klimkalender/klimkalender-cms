import { useEffect, useMemo, useState } from 'react';
import type { Action, Event, Organizer, Tag, Venue, WasmEvent } from '@/types';
import { Drawer, Group, Tabs } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useDisclosure } from '@mantine/hooks';
import { sortByDate } from '@/utils/sort-by-date';
import { EventEditForm } from './EventEditForm';
import { Logs } from 'lucide-react';
import { BoulderbotLogs } from './BoulderbotLogs';
import RunBoulderbotButton from './BoulderbotButton';
import type { Database } from '@/database.types';
import { WasmEventEditForm } from './WasmEventEditForm';

type EventsTableProps = {
  wasmEvents: WasmEvent[];
  events: Event[];
  venues: Venue[];
  tagsPerEvent: { [id: number]: Tag[] };
  allTags: Tag[]
  organizers: Organizer[];
  action: Action | null | undefined;
};

export function WasmachineTable({ wasmEvents: wasmEvents, events, venues, tagsPerEvent: defaultTagsPerEvent, allTags, organizers, action }: EventsTableProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedEvent, setSelectedEvent] = useState<WasmEvent | null>(null);
  const [selectedWasmEvent, setSelectedWasmEvent] = useState<WasmEvent | null>(null);
  const [wasmEventsList, setWasmEventsList] = useState<WasmEvent[]>(wasmEvents);
  const [activeTab, setActiveTab] = useState<string>('NEW');
  const [showBoulderbotLogs, setShowBoulderbotLogs] = useState<boolean>(false);
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }>(defaultTagsPerEvent);
  const [lastAction, setLastAction] = useState<Database["public"]["Tables"]["actions"]["Row"] | null | undefined>(action);
  const columns = useMemo<MRT_ColumnDef<WasmEvent>[]>(
    () => [
      {
        header: 'Date',
        sortingFn: (a, b) => sortByDate(a.original.date, b.original.date),
        accessorFn: (originalRow) => {
          return new Date(originalRow.date).toLocaleDateString();
        },
        id: 'start_date',
      },
      {
        // accessorKey: 'name', //simple recommended way to define a column
        header: 'Title',
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        mantineTableHeadCellProps: { sx: { color: 'green' } }, //custom props
        accessorKey: 'name',
        id: 'name', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Status',
        accessorKey: 'status', //simple recommended way to define a column
        enableHiding: false,
        hidden: true,
      },
      {
        header: 'Venue',
        accessorKey: 'hall_name',
        id: 'venue',
      },
      {
        header: 'Classification',
        id: 'classification',
        accessorKey: 'classification',
      },
      {
        header: 'Category',
        id: 'event_category',
        accessorKey: 'event_category',
      },
      {
        header: 'Processed At',
        accessorFn: (originalRow) => {
          if (!originalRow.processed_at) {
            return 'N/A';
          }
          const date = new Date(originalRow.processed_at);
          return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        },
        id: 'processed_at',
      }
    ],
    [tagsPerEvent],
  );

  const handleRowClick = (event: WasmEvent) => {
    console.log('Row clicked:', event); 
    setSelectedWasmEvent(event);
    open();
  };

  const handleEventSave = (savedEvent: WasmEvent, tags: Tag[]) => {
    setTagsPerEvent(prev => ({
      ...prev,
      [savedEvent.id]: tags,
    }));

    setWasmEventsList(prev => {
      const existingIndex = prev.findIndex(e => e.id === savedEvent.id);
      if (existingIndex >= 0) {
        // Update existing event
        return prev.map(e => e.id === savedEvent.id ? savedEvent : e);
      } else {
        // Add new event
        return [...prev, savedEvent];
      }
    });
    close();
    setSelectedWasmEvent(null);
  };

  const handleCancel = () => {
    close();
    setSelectedWasmEvent(null);
  };

  const handleEventDelete = (eventId: number) => {
    setWasmEventsList(prev => prev.filter(e => e.id !== eventId));
    close();
    setSelectedWasmEvent(null);
  };

  useEffect(() => {
    // setEventsList(events.filter(e => e.status === activeTab));
    if (activeTab === 'BOULDERBOT') {
      setShowBoulderbotLogs(true);
    } else {
      setShowBoulderbotLogs(false);

      table.setColumnFilters([
        { id: 'status', value: activeTab }
      ]);
    }
  }, [activeTab, wasmEvents]);

  const table = useMantineReactTable({
    columns,
    data: wasmEventsList,
    enableGlobalFilter: true,
    enableFilters: true,
    positionGlobalFilter: 'left',
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFilterMatchHighlighting: true,
    enableFullScreenToggle: false,
    initialState: { density: 'xs', pagination: { pageSize: 10, pageIndex: 0 }, showGlobalFilter: true, columnVisibility: { status: false } },
    sortDescFirst: true,
      mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        handleRowClick(row.original);
      },
      // sx: {
      //   cursor: 'pointer', //you might want to change the cursor too when adding an onClick
      //   fontWeight: row.original.featured ? 'bold' : undefined,
      //   color: row.original.featured ? 'darkblue' : undefined,
      // },
    }),
  });

  return (
    <>
      <Group position="right" mb="md">
        <RunBoulderbotButton onComplete={setLastAction} />
      </Group>
      <Tabs value={activeTab} onTabChange={(a) => setActiveTab(a || 'NEW')}>
        <Tabs.List>
          <Tabs.Tab value="NEW">New</Tabs.Tab>
          <Tabs.Tab value="CHANGED">Changed</Tabs.Tab>
          <Tabs.Tab value="UP_TO_DATE">Up to Date</Tabs.Tab>
          <Tabs.Tab value="REMOVED">Removed</Tabs.Tab>
          <Tabs.Tab value="EVENT_PASSED">Event Passed</Tabs.Tab>
          <Tabs.Tab icon={<Logs />} value="BOULDERBOT">Boulderbot Logs</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {!showBoulderbotLogs && (
        <MantineReactTable table={table} />
      )}
      {showBoulderbotLogs && (
       <BoulderbotLogs action={lastAction} setAction={setLastAction} />
      )}

      <Drawer position="right" size="80%" opened={opened} onClose={close}>
         <WasmEventEditForm
          wasmEvent={selectedWasmEvent}
          event={selectedWasmEvent?.event_id ? events.find(e => e.id === selectedWasmEvent.event_id) || null : null}
          venues={venues}
          organizers={organizers}
          currentTags={tagsPerEvent[selectedEvent?.id || 0] || []}
          allTags={allTags}
          onSave={handleEventSave}
          onCancel={handleCancel}
          onDelete={handleEventDelete}
        />
      </Drawer>
    </>
  );
}
