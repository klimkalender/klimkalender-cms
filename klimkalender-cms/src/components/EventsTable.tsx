import { useMemo } from 'react';
import type { Event, Organizer, Venue } from '@/types';
import { Drawer } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useDisclosure } from '@mantine/hooks';

export default function App({ events, venues, tags, organizers }: { events: Event[], venues: Venue[], tags: { [id: string]: string[] }, organizers: Organizer[] }) {

   const [opened, { open, close }] = useDisclosure(false);
  const columns = useMemo<MRT_ColumnDef<Event>[]>(
    () => [
      {
        header: 'Date',
        sortingFn: (a, b) => sortByDate(a.original.start_date_time, b.original.start_date_time),
        accessorFn: (originalRow) => new Date(originalRow.start_date_time).toLocaleDateString(),
        id: 'start_date',
      },
      {
        // accessorKey: 'name', //simple recommended way to define a column
        header: 'Title',
        sortingFn: (a, b) => a.original.title.localeCompare(b.original.title),
        mantineTableHeadCellProps: { sx: { color: 'green' } }, //custom props
        accessorFn: (originalRow) => <span dangerouslySetInnerHTML={{ __html: originalRow.title }} />, //alternate way
        id: 'title', //id required if you use accessorFn instead of accessorKey
        // Header: <i style={{ color: 'red' }}>Title</i>, //optional custom markup
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
        header: 'Organizer',
        id: 'organizer',
        accessorFn: (originalRow) => organizers.find(o => o.id === originalRow.organizer_id)?.name || '-',
        accessorKey: 'organizer',
      }
    ],
    [],
  );

  //pass table options to useMantineReactTable
  const table = useMantineReactTable({
    columns,
    data: events, //must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
    enableRowSelection: true, //enable some features
    //   enableColumnOrdering: true,
    enableGlobalFilter: true, //turn off a feature
    enableFilters: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    initialState: { density: 'xs' },
    sortDescFirst: true,
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        open();
        console.info(event, row.id);
      },
      sx: {
        cursor: 'pointer', //you might want to change the cursor too when adding an onClick
      },
    }),
  });

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return <><MantineReactTable table={table} />
    <Drawer position="right" size="xl" opened={opened} onClose={close}>
      {/* Drawer content */}
    </Drawer>
  </>;
}
function sortByDate(dateA: string | Date, dateB: string | Date): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return a - b;
}
