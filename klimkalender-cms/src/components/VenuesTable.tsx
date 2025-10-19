import { useMemo, useState } from 'react';
import type { Venue } from '@/types';
import { Drawer, Button, Group } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { useDisclosure } from '@mantine/hooks';
import { getImageTag } from '@/data/supabase';
import { VenueEditForm } from './VenueEditForm';

export function VenuesTable({ venues }: { venues: Venue[] }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [venuesList, setVenuesList] = useState<Venue[]>(venues);
  const columns = useMemo<MRT_ColumnDef<Venue>[]>(
    () => [
      {
        header: 'Name',
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
         accessorFn: (originalRow) => originalRow.name,
        // accessorFn: (originalRow) => <span dangerouslySetInnerHTML={{ __html: originalRow.name }} />, //alternate way
        id: 'name', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Full Address',
        accessorFn: (originalRow) => originalRow.full_address || '-',
        id: 'fullAddress',
      },
      {
        // accessorKey: 'name', //simple recommended way to define a column
        header: 'Geo Location',
        accessorFn: (originalRow) =>  originalRow.lat && originalRow.long ? `(${originalRow.lat}, ${originalRow.long})` : '-',
        id: 'location', //id required if you use accessorFn instead of accessorKey
      },
      {
        header: 'Image',
        accessorFn: (originalRow) => getImageTag(originalRow.image_ref, 'venue-images'),
        id: 'image',
      }
    ],
    [],
  );


  const handleRowClick = (venue: Venue) => {
    setSelectedVenue(venue);
    open();
  };

  const handleVenueSave = (savedVenue: Venue) => {
    setVenuesList(prev => {
      const existingIndex = prev.findIndex(v => v.id === savedVenue.id);
      if (existingIndex >= 0) {
        // Update existing venue
        return prev.map(v => v.id === savedVenue.id ? savedVenue : v);
      } else {
        // Add new venue
        return [...prev, savedVenue].sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    close();
    setSelectedVenue(null);
  };

  const handleCancel = () => {
    close();
    setSelectedVenue(null);
  };

  const handleCreateNew = () => {
    setSelectedVenue(null);
    open();
  };

  const handleVenueDelete = (venueId: number) => {
    setVenuesList(prev => prev.filter(v => v.id !== venueId));
    close();
    setSelectedVenue(null);
  };

  const table = useMantineReactTable({
    columns,
    data: venuesList, 
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    enableFilters: true,
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
      },
    }),
  });

  //note: you can also pass table options as props directly to <MantineReactTable /> instead of using useMantineReactTable
  //but that is not recommended and will likely be deprecated in the future
  return (
    <>
      <Group position="right" mb="md">
        <Button onClick={handleCreateNew}>
          Add Venue
        </Button>
      </Group>
      
      <MantineReactTable table={table} />
      
      <Drawer position="right" size="xl" opened={opened} onClose={close}>
        <VenueEditForm 
          venue={selectedVenue}
          onSave={handleVenueSave}
          onCancel={handleCancel}
          onDelete={handleVenueDelete}
        />
      </Drawer>
    </>
  );
}
