import { useMemo, useState, useEffect } from 'react';
import type { Profile, Venue } from '@/types';
import { Drawer, Button, Group } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef, //if using TypeScript (optional, but recommended)
} from 'mantine-react-table';
import { getImageTag } from '@/data/supabase';
import { VenueEditForm } from './VenueEditForm';
import { useNavigate } from '@tanstack/react-router';
import { lookupProfileName } from '@/utils/lookup-profile-name';
import { CreateUpdateByTooltip } from './CreateUpdateByTooltip';

export function VenuesTable({ venues, profiles, initialVenueId }: { venues: Venue[], profiles: Profile[], initialVenueId?: string }) {
  const navigate = useNavigate();
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [venuesList, setVenuesList] = useState<Venue[]>(venues);
  const opened = !!initialVenueId;

  useEffect(() => {
    if (initialVenueId) {
      if (initialVenueId === 'new') {
        setSelectedVenue(null);
      } else {
        const venue = venuesList.find(v => v.id.toString() === initialVenueId);
        setSelectedVenue(venue || null);
      }
    } else {
      setSelectedVenue(null);
    }
  }, [initialVenueId, venuesList]);
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
        header: 'Address',
        accessorFn: (originalRow) => originalRow.address || '-',
        id: 'address',
      },
      {
        header: 'City',
        accessorFn: (originalRow) => originalRow.city || '-',
        id: 'city',
      },
      {
        header: 'Country',
        accessorFn: (originalRow) => originalRow.country || '-',
        id: 'country',
      },
      {
        header: 'Postal Code',
        accessorFn: (originalRow) => originalRow.postal_code || '-',
        id: 'postalCode',
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
    [],
  );


  const handleRowClick = (venue: Venue) => {
    navigate({ to: '/venues', search: { venueId: venue.id.toString() } });
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
    navigate({ to: '/venues' });
  };

  const handleCancel = () => {
    navigate({ to: '/venues' });
  };

  const handleCreateNew = () => {
    navigate({ to: '/venues', search: { venueId: 'new' } });
  };

  const handleVenueDelete = (venueId: number) => {
    setVenuesList(prev => prev.filter(v => v.id !== venueId));
    navigate({ to: '/venues' });
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
      <Group position="apart" mb="md">
        <div className="ml-4 text-2xl font-bold text-black">Venues</div>
        <Button onClick={handleCreateNew}>
          Add Venue
        </Button>
      </Group>
      
      <MantineReactTable table={table} />
      
      <Drawer position="right" size="xl" opened={opened} onClose={() => navigate({ to: '/venues' })}>
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
