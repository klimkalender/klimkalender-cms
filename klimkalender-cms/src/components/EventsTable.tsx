import { useEffect, useMemo, useState } from 'react';
import type { Event, Organizer, Tag, Venue, Profile } from '@/types';
import { Drawer, Button, Group, Tabs, Notification } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { sortByDate } from '@/utils/sort-by-date';
import { EventEditForm } from './EventEditForm';
import { useNavigate } from '@tanstack/react-router';
import { lookupProfileName } from '@/utils/lookup-profile-name';
import { CreateUpdateByTooltip } from './CreateUpdateByTooltip';
import { supabase } from '@/data/supabase';

type EventsTableProps = {
  events: Event[];
  venues: Venue[];
  tagsPerEvent: { [id: number]: Tag[] };
  allTags: Tag[]
  organizers: Organizer[];
  initialEventId?: string;
  profiles: Profile[]
};

export function EventsTable({ events, venues, tagsPerEvent: defaultTagsPerEvent, allTags, organizers, initialEventId, profiles }: EventsTableProps) {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventsList, setEventsList] = useState<Event[]>(events);
  const [activeTab, setActiveTab] = useState<string>('PUBLISHED');
  const [tagsPerEvent, setTagsPerEvent] = useState<{ [id: number]: Tag[] }>(defaultTagsPerEvent);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const opened = !!initialEventId;

  useEffect(() => {
    if (initialEventId) {
      if (initialEventId === 'new') {
        setSelectedEvent(null);
      } else {
        const event = eventsList.find(e => e.id.toString() === initialEventId);
        setSelectedEvent(event || null);
        if (event) {
          setActiveTab(event.status);
        }
      }
    } else {
      setSelectedEvent(null);
    }
  }, [initialEventId, eventsList]);
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
      },
      {
        header: 'Created / Updated',
        accessorFn: (originalRow) => `${lookupProfileName(profiles, originalRow.created_by)} / ${lookupProfileName(profiles, originalRow.updated_by)}`,
        id: 'created_updated_by',
        Cell: ({ row }) =>
          <CreateUpdateByTooltip
            createdAt={row.original.created_at}
            createdBy={row.original.created_by}
            updatedAt={row.original.updated_at}
            updatedBy={row.original.updated_by}
            profiles={profiles}
          />,
      }
    ],
    [tagsPerEvent],
  );

  const handleRowClick = (event: Event) => {
    navigate({ to: '/events', search: { eventId: event.id.toString() } });
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
        console.log('updating existing event');
        console.log(savedEvent);
        return prev.map(e => e.id === savedEvent.id ? savedEvent : e);
      } else {
        // Add new event
        return [...prev, savedEvent];
      }
    });
    navigate({ to: '/events' });
  };

  const handleCancel = () => {
    navigate({ to: '/events' });
  };

  const handleCreateNew = () => {
    navigate({ to: '/events', search: { eventId: 'new' } });
  };

  const handleArchivePassedEvents = async () => {
    // Archive events that are older than 30 days and currently published
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {

      // First, find all event IDs that are DRAFT or PUBLISHED and older than yesterday
      const { data: eventsToArchive, error: findError } = await supabase
        .from('events')
        .select('id')
        .in('status', ['DRAFT', 'PUBLISHED'])
        .lt('start_date_time', yesterday.toISOString());

      if (findError) {
        console.error('Error finding events to archive:', findError);
        return;
      }

      const { error } = await supabase
        .from('events')
        .update({ status: 'ARCHIVED' })
        .in('id', eventsToArchive?.map(e => e.id) || []);

      if (error) {
        console.error('Error archiving events:', error);
      }

      // Reload the events list by updating the local state
      // a bit tricky 
      setEventsList(prev =>
        prev.map(event => {
          if (eventsToArchive?.some(e => e.id === event.id)) {
            return { ...event, status: 'ARCHIVED' };
          }
          return event;
        })
      );
      // Show notification about archived events
      if (!error) {
        setNotification({
          type: 'success',
          message: `Archived ${eventsToArchive?.length || 0} events.`
        })
      } else {
        setNotification({
          type: 'error',
          message: `Archive failed: ${error || 'Unknown error'}`
        })
      }

    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }

  const handleEventDelete = (eventId: number) => {
    setEventsList(prev => prev.filter(e => e.id !== eventId));
    navigate({ to: '/events' });
  };

  useEffect(() => {
    // setEventsList(events.filter(e => e.status === activeTab));
    table.setColumnFilters([
      { id: 'status', value: activeTab }
    ]);
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
      <Group position="apart" mb="md">
        <div className="ml-4 text-2xl font-bold text-black">Events</div>
        <Group>
          <Button variant="outline" onClick={handleArchivePassedEvents}>
            Archive Passed Events
          </Button>
          <Button onClick={handleCreateNew}>
            Add Event
          </Button>
        </Group>
      </Group>
      <Tabs value={activeTab} onTabChange={(a) => setActiveTab(a || 'DRAFT')}>
        <Tabs.List>
          <Tabs.Tab value="DRAFT">Draft</Tabs.Tab>
          <Tabs.Tab value="PUBLISHED">Published</Tabs.Tab>
          <Tabs.Tab value="ARCHIVED">Archived</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <MantineReactTable table={table} />

      <Drawer position="right" size="xl" opened={opened} onClose={() => navigate({ to: '/events' })}>
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
      {notification && (
        <Notification
          color={notification.type === 'success' ? 'green' : 'red'}
          onClose={() => setNotification(null)}
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            minWidth: 300
          }}
        >
          {notification.message}
        </Notification>
      )}
    </>
  );
}

