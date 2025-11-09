import { useEffect, useMemo, useState } from 'react';
import type { Action, Event, Organizer, Tag, Venue } from '@/types';
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

type EventsTableProps = {
  events: Event[];
  venues: Venue[];
  tagsPerEvent: { [id: number]: Tag[] };
  allTags: Tag[]
  organizers: Organizer[];
  action: Action | null | undefined;
};

export function WasmachineTable({ events, venues, tagsPerEvent: defaultTagsPerEvent, allTags, organizers, action }: EventsTableProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventsList, setEventsList] = useState<Event[]>(events);
  const [activeTab, setActiveTab] = useState<string>('PUBLISHED');
  const [showBoulderbotLogs, setShowBoulderbotLogs] = useState<boolean>(false);
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }>(defaultTagsPerEvent);
  const [lastAction, setLastAction] = useState<Database["public"]["Tables"]["actions"]["Row"] | null | undefined>(action);
  const columns = useMemo<MRT_ColumnDef<Event>[]>(
    () => [
      {
        header: 'Date',
        sortingFn: (a, b) => sortByDate(a.original.start_date_time, b.original.start_date_time),
        accessorFn: (originalRow) => {
          if (!originalRow.is_full_day) {
            return `${new Date(originalRow.start_date_time).toLocaleDateString()} ${new Date(originalRow.start_date_time).toLocaleTimeString().substring(0, 5)}`;
          }
          return new Date(originalRow.start_date_time).toLocaleDateString();
        },
        id: 'start_date',
      },
      {
        // accessorKey: 'name', //simple recommended way to define a column
        header: 'Title',
        sortingFn: (a, b) => a.original.title.localeCompare(b.original.title),
        mantineTableHeadCellProps: { sx: { color: 'green' } }, //custom props
        accessorKey: 'title',
        id: 'title', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Status',
        accessorKey: 'status', //simple recommended way to define a column
        enableHiding: false,
        hidden: true,
      },
      {
        header: 'Venue',
        accessorFn: (originalRow) => {
          const venue = venues.find(v => v.id === originalRow.venue_id);
          return venue ? venue.name : 'N/A';
        },
        id: 'venue',
      },
      {
        header: 'Tags',
        accessorFn: (originalRow) => {
          return tagsPerEvent[originalRow.id]?.map(tag => tag.name).join(', ') || '-';
        },
        id: 'tags',
      }
      ,
      {
        header: 'Featured',
        accessorFn: (originalRow) => originalRow.featured ? 'Yes' : 'No',
        id: 'featured',
      }
      ,
      {
        header: 'Organizer',
        id: 'organizer',
        accessorFn: (originalRow) => organizers.find(o => o.id === originalRow.organizer_id)?.name || '-',
        accessorKey: 'organizer',
      }
    ],
    [tagsPerEvent],
  );

  const handleRowClick = (event: Event) => {
    setSelectedEvent(event);
    open();
  };

  const handleEventSave = (savedEvent: Event, tags: Tag[]) => {
    setTagsPerEvent(prev => ({
      ...prev,
      [savedEvent.id]: tags,
    }));

    setEventsList(prev => {
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
    setSelectedEvent(null);
  };

  const handleCancel = () => {
    close();
    setSelectedEvent(null);
  };

  const handleEventDelete = (eventId: number) => {
    setEventsList(prev => prev.filter(e => e.id !== eventId));
    close();
    setSelectedEvent(null);
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
  }, [activeTab, events]);

  const table = useMantineReactTable({
    columns,
    data: eventsList,
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
      sx: {
        cursor: 'pointer', //you might want to change the cursor too when adding an onClick
        fontWeight: row.original.featured ? 'bold' : undefined,
        color: row.original.featured ? 'darkblue' : undefined,
      },
    }),
  });

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return (
    <>
      <Group position="right" mb="md">
        <RunBoulderbotButton onComplete={setLastAction} />
      </Group>
      <Tabs value={activeTab} onTabChange={(a) => setActiveTab(a || 'DRAFT')}>
        <Tabs.List>
          <Tabs.Tab value="DRAFT">Draft</Tabs.Tab>
          <Tabs.Tab value="PUBLISHED">Published</Tabs.Tab>
          <Tabs.Tab value="ARCHIVED">Archived</Tabs.Tab>
          <Tabs.Tab icon={<Logs />} value="BOULDERBOT">Boulderbot Logs</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {!showBoulderbotLogs && (
        <MantineReactTable table={table} />
      )}
      {showBoulderbotLogs && (
       <BoulderbotLogs action={lastAction} setAction={setLastAction} />
      )}

      <Drawer position="right" size="xl" opened={opened} onClose={close}>
        <EventEditForm
          event={selectedEvent}
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
