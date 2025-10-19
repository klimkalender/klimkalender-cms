import { useMemo, useState } from 'react';
import type { Event, Organizer, Venue } from '@/types';
import { Drawer, Button, Group } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useDisclosure } from '@mantine/hooks';
import { sortByDate } from '@/utils/sort-by-date';
import { EventEditForm } from './EventEditForm';

export function EventsTable({ events, venues, tags, organizers }: { events: Event[], venues: Venue[], tags: { [id: string]: string[] }, organizers: Organizer[] }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventsList, setEventsList] = useState<Event[]>(events);
  const columns = useMemo<MRT_ColumnDef<Event>[]>(
    () => [
      {
        header: 'Date',
        sortingFn: (a, b) => sortByDate(a.original.start_date_time, b.original.start_date_time),
        accessorFn: (originalRow) => {
          if (!originalRow.is_full_day) {
            return `${new Date(originalRow.start_date_time).toLocaleDateString()} ${new Date(originalRow.start_date_time).toLocaleTimeString().substring(0,5)}`;
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
        accessorFn: (originalRow) => tags[originalRow.id]?.join(', ') || '-',
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
    [],
  );

  const handleRowClick = (event: Event) => {
    setSelectedEvent(event);
    open();
  };

  const handleEventSave = (savedEvent: Event) => {
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

  const handleCreateNew = () => {
    setSelectedEvent(null);
    open();
  };

  const handleEventDelete = (eventId: number) => {
    setEventsList(prev => prev.filter(e => e.id !== eventId));
    close();
    setSelectedEvent(null);
  };

  const table = useMantineReactTable({
    columns,
    data: eventsList, 
    enableGlobalFilter: true,
    enableFilters: true,
    positionGlobalFilter: 'left',
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'xs', pagination: { pageSize: 10, pageIndex: 0 } , showGlobalFilter: true,},
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
        <Button onClick={handleCreateNew}>
        Add Event
        </Button>
      </Group>
      
      <MantineReactTable table={table} />
      
      <Drawer position="right" size="xl" opened={opened} onClose={close}>
        <EventEditForm 
          event={selectedEvent}
          venues={venues}
          organizers={organizers}
          onSave={handleEventSave}
          onCancel={handleCancel}
          onDelete={handleEventDelete}
        />
      </Drawer>
    </>
  );
}
